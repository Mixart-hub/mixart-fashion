import crypto from 'crypto'
import { prisma } from '../../models/prisma'
import { emitToUser } from '../../websocket/socket'

// Payme error codes
const PaymeError = {
  InvalidAmount:        { code: -31001, message: 'Wrong amount' },
  UserNotFound:         { code: -31050, message: 'User not found' },
  OrderNotFound:        { code: -31050, message: 'Order not found' },
  CantPerform:          { code: -31008, message: 'Can\'t perform this operation' },
  TransactionNotFound:  { code: -31003, message: 'Transaction not found' },
  TransactionAlreadyDone: { code: -31060, message: 'Transaction already completed' },
  TransactionCancelled: { code: -31061, message: 'Transaction already cancelled' },
  UnableToCancelPaid:   { code: -31007, message: 'Unable to cancel paid transaction' },
  AuthFailed:           { code: -32504, message: 'Insufficient privilege' },
}

// Transaction states
const State = { CREATED: 1, COMPLETED: 2, CANCELLED: -1, CANCELLED_AFTER_COMPLETE: -2 }

export function verifyPaymeAuth(authHeader: string | undefined): boolean {
  if (!authHeader?.startsWith('Basic ')) return false
  const encoded = authHeader.slice(6)
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
  const [, password] = decoded.split(':')
  return password === process.env.PAYME_KEY
}

export async function handlePaymeRpc(method: string, params: Record<string, unknown>) {
  switch (method) {
    case 'CheckPerformTransaction': return checkPerformTransaction(params)
    case 'CreateTransaction':       return createTransaction(params)
    case 'PerformTransaction':      return performTransaction(params)
    case 'CancelTransaction':       return cancelTransaction(params)
    case 'CheckTransaction':        return checkTransaction(params)
    case 'GetStatement':            return getStatement(params)
    default: return error(-32601, 'Method not found')
  }
}

async function checkPerformTransaction(params: Record<string, unknown>) {
  const orderId = (params.account as Record<string, string>)?.order_id
  const amount = params.amount as number

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return error(PaymeError.OrderNotFound.code, PaymeError.OrderNotFound.message)

  if (order.total * 100 !== amount) {
    return error(PaymeError.InvalidAmount.code, PaymeError.InvalidAmount.message)
  }
  if (order.status === 'CANCELLED') {
    return error(PaymeError.CantPerform.code, PaymeError.CantPerform.message)
  }

  return result({ allow: true })
}

async function createTransaction(params: Record<string, unknown>) {
  const id = params.id as string
  const time = params.time as number
  const amount = params.amount as number
  const orderId = (params.account as Record<string, string>)?.order_id

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return error(PaymeError.OrderNotFound.code, PaymeError.OrderNotFound.message)
  if (order.total * 100 !== amount) {
    return error(PaymeError.InvalidAmount.code, PaymeError.InvalidAmount.message)
  }

  // Check if transaction already exists (idempotency)
  const existing = await prisma.payment.findFirst({ where: { externalId: id } })
  if (existing) {
    if (existing.status === 'FAILED') {
      return error(PaymeError.TransactionCancelled.code, PaymeError.TransactionCancelled.message)
    }
    return result({ create_time: time, transaction: existing.id, state: State.CREATED })
  }

  // Check if order already has a completed payment
  const paid = await prisma.payment.findFirst({ where: { orderId, status: 'PAID' } })
  if (paid) return error(PaymeError.TransactionAlreadyDone.code, PaymeError.TransactionAlreadyDone.message)

  const payment = await prisma.payment.create({
    data: { orderId, provider: 'PAYME', externalId: id, amount: order.total }
  })

  return result({ create_time: time, transaction: payment.id, state: State.CREATED })
}

async function performTransaction(params: Record<string, unknown>) {
  const id = params.id as string
  const payment = await prisma.payment.findFirst({ where: { externalId: id } })

  if (!payment) return error(PaymeError.TransactionNotFound.code, PaymeError.TransactionNotFound.message)
  if (payment.status === 'FAILED') {
    return error(PaymeError.TransactionCancelled.code, PaymeError.TransactionCancelled.message)
  }
  if (payment.status === 'PAID') {
    return result({ transaction: payment.id, perform_time: payment.updatedAt.getTime(), state: State.COMPLETED })
  }

  const now = Date.now()
  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID' } })
  await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'CONFIRMED' } })

  const order = await prisma.order.findUnique({ where: { id: payment.orderId } })
  if (order) emitToUser(order.userId, 'payment:confirmed', { orderId: order.id, provider: 'PAYME' })

  return result({ transaction: payment.id, perform_time: now, state: State.COMPLETED })
}

async function cancelTransaction(params: Record<string, unknown>) {
  const id = params.id as string
  const reason = params.reason as number

  const payment = await prisma.payment.findFirst({ where: { externalId: id } })
  if (!payment) return error(PaymeError.TransactionNotFound.code, PaymeError.TransactionNotFound.message)

  if (payment.status === 'PAID') {
    // Can only cancel paid orders if they haven't been shipped
    const order = await prisma.order.findUnique({ where: { id: payment.orderId } })
    if (order && ['SHIPPED', 'DELIVERED'].includes(order.status)) {
      return error(PaymeError.UnableToCancelPaid.code, PaymeError.UnableToCancelPaid.message)
    }
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } })
    await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'CANCELLED' } })
    return result({ transaction: payment.id, cancel_time: Date.now(), state: State.CANCELLED_AFTER_COMPLETE })
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
  const order = await prisma.order.findUnique({ where: { id: payment.orderId } })
  if (order) {
    await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } })
    emitToUser(order.userId, 'payment:failed', { orderId: order.id, reason })
  }

  return result({ transaction: payment.id, cancel_time: Date.now(), state: State.CANCELLED })
}

async function checkTransaction(params: Record<string, unknown>) {
  const id = params.id as string
  const payment = await prisma.payment.findFirst({ where: { externalId: id } })

  if (!payment) return error(PaymeError.TransactionNotFound.code, PaymeError.TransactionNotFound.message)

  const stateMap: Record<string, number> = {
    PENDING:  State.CREATED,
    PAID:     State.COMPLETED,
    FAILED:   State.CANCELLED,
    REFUNDED: State.CANCELLED_AFTER_COMPLETE
  }

  return result({
    create_time:  payment.createdAt.getTime(),
    perform_time: payment.status === 'PAID' ? payment.updatedAt.getTime() : 0,
    cancel_time:  payment.status === 'FAILED' ? payment.updatedAt.getTime() : 0,
    transaction:  payment.id,
    state:        stateMap[payment.status] ?? State.CREATED,
    reason:       null
  })
}

async function getStatement(params: Record<string, unknown>) {
  const from = new Date(params.from as number)
  const to = new Date(params.to as number)

  const payments = await prisma.payment.findMany({
    where: { provider: 'PAYME', createdAt: { gte: from, lte: to } },
    include: { order: true }
  })

  return result({
    transactions: payments.map(p => ({
      id: p.externalId,
      time: p.createdAt.getTime(),
      amount: p.amount * 100,
      account: { order_id: p.orderId },
      create_time: p.createdAt.getTime(),
      perform_time: p.status === 'PAID' ? p.updatedAt.getTime() : 0,
      cancel_time: p.status === 'FAILED' ? p.updatedAt.getTime() : 0,
      transaction: p.id,
      state: p.status === 'PAID' ? State.COMPLETED : State.CREATED,
      reason: null
    }))
  })
}

function result(data: unknown) { return { result: data } }
function error(code: number, message: string) { return { error: { code, message: { ru: message, uz: message, en: message } } } }
