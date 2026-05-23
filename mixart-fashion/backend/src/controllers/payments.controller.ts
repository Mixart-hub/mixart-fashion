import { Request, Response } from 'express'
import { prisma } from '../models/prisma'
import { AuthRequest } from '../middleware/auth.middleware'
import { verifyPaymeAuth, handlePaymeRpc } from '../services/payments/payme.service'
import { handleClickPrepare, handleClickComplete, ClickParams } from '../services/payments/click.service'

// ─── Payme ────────────────────────────────────────────────────────────────────

export async function paymeWebhook(req: Request, res: Response) {
  if (!verifyPaymeAuth(req.headers.authorization)) {
    return res.status(401).json({
      error: { code: -32504, message: { ru: 'Insufficient privilege', uz: 'Insufficient privilege', en: 'Insufficient privilege' } }
    })
  }

  const { id, method, params } = req.body
  const response = await handlePaymeRpc(method, params ?? {})
  res.json({ id, jsonrpc: '2.0', ...response })
}

export async function initPayme(req: AuthRequest, res: Response) {
  const { orderId } = req.body
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: req.userId! } })
  if (!order) return res.status(404).json({ error: 'Order not found' })

  // Amount is in tiyin (1 UZS = 100 tiyin), order.total is stored in tiyin
  const amountTiyin = order.total * 100
  const merchantId = process.env.PAYME_MERCHANT_ID!

  // Payme checkout URL: base64 of "m=<merchant_id>;ac.order_id=<id>;a=<amount>"
  const payload = `m=${merchantId};ac.order_id=${orderId};a=${amountTiyin}`
  const encoded = Buffer.from(payload).toString('base64')
  const url = `https://checkout.paycom.uz/${encoded}`

  res.json({ url, provider: 'payme', orderId, amount: amountTiyin })
}

// ─── Click ────────────────────────────────────────────────────────────────────

export async function clickWebhook(req: Request, res: Response) {
  const p = req.body as ClickParams

  if (p.action === '0') {
    const result = await handleClickPrepare(p)
    return res.json(result)
  }

  if (p.action === '1') {
    const result = await handleClickComplete(p)
    return res.json(result)
  }

  res.json({ error: -3, error_note: 'Action not found' })
}

export async function initClick(req: AuthRequest, res: Response) {
  const { orderId } = req.body
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: req.userId! } })
  if (!order) return res.status(404).json({ error: 'Order not found' })

  const serviceId = process.env.CLICK_SERVICE_ID!
  const merchantId = process.env.CLICK_MERCHANT_ID!
  const amountSum = (order.total / 100).toFixed(2) // convert tiyin → sum

  const params = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: amountSum,
    transaction_param: orderId,
    return_url: `${process.env.FRONTEND_URL}/payment/result?orderId=${orderId}&provider=click`
  })

  const url = `https://my.click.uz/services/pay?${params}`
  res.json({ url, provider: 'click', orderId, amount: order.total })
}

// ─── Initiate (auto-detect provider) ─────────────────────────────────────────

export async function initiatePayment(req: AuthRequest, res: Response) {
  const { orderId, provider } = req.body as { orderId: string; provider: 'PAYME' | 'CLICK' }
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: req.userId! } })
  if (!order) return res.status(404).json({ error: 'Order not found' })

  if (provider === 'PAYME') {
    const amountTiyin = order.total * 100
    const payload = `m=${process.env.PAYME_MERCHANT_ID};ac.order_id=${orderId};a=${amountTiyin}`
    const url = `https://checkout.paycom.uz/${Buffer.from(payload).toString('base64')}`
    return res.json({ url, provider: 'PAYME' })
  }

  if (provider === 'CLICK') {
    const params = new URLSearchParams({
      service_id: process.env.CLICK_SERVICE_ID!,
      merchant_id: process.env.CLICK_MERCHANT_ID!,
      amount: (order.total / 100).toFixed(2),
      transaction_param: orderId,
      return_url: `${process.env.FRONTEND_URL}/payment/result?orderId=${orderId}&provider=click`
    })
    return res.json({ url: `https://my.click.uz/services/pay?${params}`, provider: 'CLICK' })
  }

  res.status(400).json({ error: 'Unknown provider' })
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export async function getPaymentStatus(req: AuthRequest, res: Response) {
  const payment = await prisma.payment.findFirst({
    where: { orderId: req.params.orderId, order: { userId: req.userId! } }
  })
  if (!payment) return res.status(404).json({ error: 'Not found' })
  res.json({ status: payment.status, provider: payment.provider })
}
