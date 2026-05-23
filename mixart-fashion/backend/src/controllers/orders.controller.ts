import { Response } from 'express'
import { prisma } from '../models/prisma'
import { AuthRequest } from '../middleware/auth.middleware'
import { emitToUser } from '../websocket/socket'
import { awardPoints } from './loyalty.controller'
import { createNotification } from './notifications.controller'
import { telegramService } from '../services/telegram.service'

export async function myOrders(req: AuthRequest, res: Response) {
  const orders = await prisma.order.findMany({
    where: { userId: req.userId! },
    include: { items: { include: { product: true } }, payment: true },
    orderBy: { createdAt: 'desc' }
  })
  res.json(orders)
}

export async function getOne(req: AuthRequest, res: Response) {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { items: { include: { product: true } }, payment: true }
  })
  if (!order) return res.status(404).json({ error: 'Not found' })
  res.json(order)
}

export async function create(req: AuthRequest, res: Response) {
  const { items, address, branchId, deliveryType = 'DELIVERY', notes } = req.body as {
    items: { productId: string; quantity: number; size?: string; color?: string }[]
    address?: string; branchId?: string; deliveryType?: string; notes?: string
  }

  const products = await prisma.product.findMany({
    where: { id: { in: items.map(i => i.productId) }, isActive: true }
  })

  for (const item of items) {
    const product = products.find(p => p.id === item.productId)
    if (!product) return res.status(400).json({ error: `Product ${item.productId} not found` })
    if (product.stock < item.quantity) return res.status(400).json({ error: `${product.name} — yetarli miqdor yo'q` })
  }

  const total = items.reduce((sum, item) => {
    const p = products.find(p => p.id === item.productId)
    return sum + (p?.price ?? 0) * item.quantity
  }, 0)

  const order = await prisma.order.create({
    data: {
      userId: req.userId!,
      total,
      address,
      branchId,
      deliveryType: deliveryType as any,
      notes,
      items: {
        create: items.map(item => ({
          productId: item.productId,
          quantity:  item.quantity,
          price:     products.find(p => p.id === item.productId)?.price ?? 0,
          size:      item.size,
          color:     item.color,
        }))
      }
    },
    include: { items: { include: { product: true } } }
  })

  // Decrease stock
  await Promise.all(items.map(item =>
    prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } }
    })
  ))

  emitToUser(req.userId!, 'order:created', order)

  // Notification
  await createNotification(
    req.userId!, 'ORDER_STATUS',
    'Buyurtma qabul qilindi!',
    `Buyurtma #${order.id.slice(0, 8)} muvaffaqiyatli berildi`
  )

  res.status(201).json(order)
}

export async function cancel(req: AuthRequest, res: Response) {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.userId!, status: 'PENDING' }
  })
  if (!order) return res.status(404).json({ error: 'Not found or cannot cancel' })

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: 'CANCELLED' }
  })

  // Restore stock
  const orderItems = await prisma.orderItem.findMany({ where: { orderId: order.id } })
  await Promise.all(orderItems.map(item =>
    prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } }
    })
  ))

  emitToUser(req.userId!, 'order:updated', updated)
  res.json(updated)
}

export async function updateStatus(req: AuthRequest, res: Response) {
  const { status } = req.body
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { user: true } })
  if (!order) return res.status(404).json({ error: 'Not found' })

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status }
  })

  emitToUser(order.userId, 'order:updated', { id: order.id, status })

  // Notify on delivered
  if (status === 'DELIVERED') {
    const points = Math.floor(order.total / 10000)
    if (points > 0) {
      await awardPoints(order.userId, points, 'EARNED', order.id, `Buyurtma #${order.id.slice(0, 8)} uchun ball`)
      await createNotification(order.userId, 'LOYALTY', `+${points} bonus ball!`,
        `Buyurtma #${order.id.slice(0, 8)} uchun ${points} ball berildi`)
    }
  }

  // Telegram notification
  if (order.user.telegramId) {
    telegramService.sendOrderNotification(order.user.telegramId, order.id, status).catch(() => {})
  }

  await createNotification(
    order.userId, 'ORDER_STATUS',
    'Buyurtma holati yangilandi',
    `Buyurtma #${order.id.slice(0, 8)}: ${status}`
  )

  res.json(updated)
}
