import { Response } from 'express'
import { prisma } from '../models/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export async function getLoyalty(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { loyaltyPoints: true }
  })
  const transactions = await prisma.loyaltyTransaction.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 20
  })
  res.json({ points: user?.loyaltyPoints ?? 0, transactions })
}

export async function awardPoints(
  userId: string,
  points: number,
  type: 'EARNED' | 'SPENT' | 'BONUS' | 'EXPIRED',
  orderId?: string,
  note?: string
) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: points } }
    }),
    prisma.loyaltyTransaction.create({
      data: { userId, points, type, orderId, note }
    })
  ])
}
