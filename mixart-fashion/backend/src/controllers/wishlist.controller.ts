import { Response } from 'express'
import { prisma } from '../models/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export async function getWishlist(req: AuthRequest, res: Response) {
  const items = await prisma.wishlistItem.findMany({
    where: { userId: req.userId! },
    include: { product: true },
    orderBy: { createdAt: 'desc' }
  })
  res.json(items)
}

export async function addToWishlist(req: AuthRequest, res: Response) {
  const { productId } = req.body
  const item = await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: req.userId!, productId } },
    create: { userId: req.userId!, productId },
    update: {},
    include: { product: true }
  })
  res.json(item)
}

export async function removeFromWishlist(req: AuthRequest, res: Response) {
  await prisma.wishlistItem.deleteMany({
    where: { userId: req.userId!, productId: req.params.productId }
  })
  res.json({ success: true })
}
