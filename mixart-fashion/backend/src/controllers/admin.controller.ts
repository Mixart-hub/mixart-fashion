import { Request, Response } from 'express'
import { prisma } from '../models/prisma'
import { emitToUser } from '../websocket/socket'

export async function stats(_req: Request, res: Response) {
  const [users, orders, revenue] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } })
  ])
  res.json({ users, orders, revenue: revenue._sum.amount ?? 0 })
}

export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
  res.json(users)
}

export async function listOrders(_req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    include: { user: true, items: { include: { product: true } }, payment: true },
    orderBy: { createdAt: 'desc' }
  })
  res.json(orders)
}

export async function updateOrderStatus(req: Request, res: Response) {
  const { status } = req.body
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status }
  })
  emitToUser(order.userId, 'order:updated', order)
  res.json(order)
}
