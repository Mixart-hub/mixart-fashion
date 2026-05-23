import crypto from 'crypto'
import { prisma } from '../../models/prisma'
import { emitToUser } from '../../websocket/socket'

// Click error codes
export const ClickError = {
  Success:            { code: 0,   note: 'Success' },
  SignFailed:         { code: -1,  note: 'Sign check failed' },
  InvalidAmount:      { code: -2,  note: 'Incorrect parameter amount' },
  ActionNotFound:     { code: -3,  note: 'Action not found' },
  AlreadyPaid:        { code: -4,  note: 'Already paid' },
  UserNotFound:       { code: -5,  note: 'User not found' },
  TransactionNotFound:{ code: -6,  note: 'Transaction not found' },
  BadRequest:         { code: -8,  note: 'Error in request from Click' },
  TransactionCancelled:{code: -9,  note: 'Transaction cancelled' },
  OrderNotFound:      { code: -5,  note: 'Order not found' },
}

export interface ClickParams {
  click_trans_id:    string
  service_id:        string
  click_paydoc_id:   string
  merchant_trans_id: string
  amount:            string
  action:            string
  error:             string
  error_note:        string
  sign_time:         string
  sign_string:       string
  merchant_prepare_id?: string
}

function buildSign(p: ClickParams, secretKey: string): string {
  const prepareId = p.merchant_prepare_id ?? ''
  const base = p.action === '0'
    ? `${p.click_trans_id}${p.service_id}${secretKey}${p.merchant_trans_id}${p.amount}${p.action}${p.sign_time}`
    : `${p.click_trans_id}${p.service_id}${secretKey}${p.merchant_trans_id}${prepareId}${p.amount}${p.action}${p.sign_time}`
  return crypto.createHash('md5').update(base).digest('hex')
}

export async function handleClickPrepare(p: ClickParams) {
  const secretKey = process.env.CLICK_SECRET_KEY!
  const expected = buildSign(p, secretKey)

  if (p.sign_string !== expected) {
    return clickError(p, ClickError.SignFailed, null)
  }

  if (parseInt(p.error) < 0) {
    return clickError(p, ClickError.BadRequest, null)
  }

  const order = await prisma.order.findUnique({ where: { id: p.merchant_trans_id } })
  if (!order) return clickError(p, ClickError.OrderNotFound, null)

  const expectedAmount = order.total / 100 // convert from tiyin to sum
  if (Math.abs(parseFloat(p.amount) - expectedAmount) > 0.01) {
    return clickError(p, ClickError.InvalidAmount, null)
  }

  if (order.status === 'CANCELLED') {
    return clickError(p, ClickError.TransactionCancelled, null)
  }

  // Check if already paid
  const existingPaid = await prisma.payment.findFirst({
    where: { orderId: order.id, status: 'PAID' }
  })
  if (existingPaid) return clickError(p, ClickError.AlreadyPaid, null)

  // Create or find pending payment
  let payment = await prisma.payment.findFirst({
    where: { orderId: order.id, provider: 'CLICK' }
  })
  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'CLICK',
        externalId: p.click_trans_id,
        amount: order.total
      }
    })
  }

  return {
    click_trans_id:     parseInt(p.click_trans_id),
    merchant_trans_id:  p.merchant_trans_id,
    merchant_prepare_id: payment.id,
    error:              ClickError.Success.code,
    error_note:         ClickError.Success.note
  }
}

export async function handleClickComplete(p: ClickParams) {
  const secretKey = process.env.CLICK_SECRET_KEY!
  const expected = buildSign(p, secretKey)

  if (p.sign_string !== expected) {
    return clickError(p, ClickError.SignFailed, p.merchant_prepare_id ?? null)
  }

  const payment = await prisma.payment.findUnique({ where: { id: p.merchant_prepare_id } })
  if (!payment) return clickError(p, ClickError.TransactionNotFound, p.merchant_prepare_id ?? null)

  if (payment.status === 'PAID') {
    return clickError(p, ClickError.AlreadyPaid, payment.id)
  }
  if (payment.status === 'FAILED') {
    return clickError(p, ClickError.TransactionCancelled, payment.id)
  }

  if (parseInt(p.error) < 0) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
    await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'CANCELLED' } })
    const order = await prisma.order.findUnique({ where: { id: payment.orderId } })
    if (order) emitToUser(order.userId, 'payment:failed', { orderId: order.id, provider: 'CLICK' })
    return clickError(p, ClickError.BadRequest, payment.id)
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'PAID', externalId: p.click_trans_id }
  })
  await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'CONFIRMED' } })

  const order = await prisma.order.findUnique({ where: { id: payment.orderId } })
  if (order) emitToUser(order.userId, 'payment:confirmed', { orderId: order.id, provider: 'CLICK' })

  return {
    click_trans_id:     parseInt(p.click_trans_id),
    merchant_trans_id:  p.merchant_trans_id,
    merchant_confirm_id: payment.id,
    error:              ClickError.Success.code,
    error_note:         ClickError.Success.note
  }
}

function clickError(p: ClickParams, err: { code: number; note: string }, prepareId: string | null) {
  return {
    click_trans_id:     parseInt(p.click_trans_id),
    merchant_trans_id:  p.merchant_trans_id,
    merchant_prepare_id: prepareId,
    error:              err.code,
    error_note:         err.note
  }
}
