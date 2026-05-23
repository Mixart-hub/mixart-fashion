import { Response } from 'express'
import { prisma } from '../models/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export async function getNotifications(req: AuthRequest, res: Response) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
  const unreadCount = await prisma.notification.count({
    where: { userId: req.userId!, isRead: false }
  })
  res.json({ notifications, unreadCount })
}

export async function markRead(req: AuthRequest, res: Response) {
  await prisma.notification.update({
    where: { id: req.params.id, userId: req.userId! } as any,
    data: { isRead: true }
  })
  res.json({ success: true })
}

export async function markAllRead(req: AuthRequest, res: Response) {
  await prisma.notification.updateMany({
    where: { userId: req.userId!, isRead: false },
    data: { isRead: true }
  })
  res.json({ success: true })
}

export async function createNotification(
  userId: string,
  type: 'ORDER_STATUS' | 'PAYMENT' | 'PROMO' | 'SYSTEM' | 'LOYALTY',
  title: string,
  body: string,
  data?: object
) {
  return prisma.notification.create({
    data: { userId, type, title, body, data }
  })
}
