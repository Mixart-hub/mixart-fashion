import { Request, Response } from 'express'
import { prisma } from '../models/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export async function getProductReviews(req: Request, res: Response) {
  const reviews = await prisma.review.findMany({
    where: { productId: req.params.productId, isVisible: true },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' }
  })
  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0
  res.json({ reviews, average: Math.round(avg * 10) / 10, count: reviews.length })
}

export async function createReview(req: AuthRequest, res: Response) {
  const { productId, rating, comment } = req.body
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' })

  const review = await prisma.review.upsert({
    where: { userId_productId: { userId: req.userId!, productId } },
    create: { userId: req.userId!, productId, rating, comment },
    update: { rating, comment },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } }
  })
  res.json(review)
}

export async function deleteReview(req: AuthRequest, res: Response) {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } })
  if (!review) return res.status(404).json({ error: 'Not found' })
  if (review.userId !== req.userId && req.userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  await prisma.review.delete({ where: { id: req.params.id } })
  res.json({ success: true })
}
