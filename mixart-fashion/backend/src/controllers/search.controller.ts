import { Request, Response } from 'express'
import { prisma } from '../models/prisma'

export async function search(req: Request, res: Response) {
  const q = String(req.query.q || '').trim()
  const category = req.query.category as string
  const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined
  const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined
  const size = req.query.size as string
  const color = req.query.color as string
  const sort = req.query.sort as string
  const page = parseInt(req.query.page as string) || 1
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

  const where: any = { isActive: true }
  if (q) where.OR = [
    { name: { contains: q, mode: 'insensitive' } },
    { nameUz: { contains: q, mode: 'insensitive' } },
    { nameRu: { contains: q, mode: 'insensitive' } },
    { nameEn: { contains: q, mode: 'insensitive' } },
    { tags: { has: q } }
  ]
  if (category) where.categoryId = category
  if (minPrice !== undefined) where.price = { ...where.price, gte: minPrice }
  if (maxPrice !== undefined) where.price = { ...where.price, lte: maxPrice }
  if (size) where.sizes = { has: size }
  if (color) where.colors = { has: color }

  const orderBy: any =
    sort === 'price_asc'  ? { price: 'asc' } :
    sort === 'price_desc' ? { price: 'desc' } :
    sort === 'newest'     ? { createdAt: 'desc' } :
    { isFeatured: 'desc' }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where, orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { category: true, reviews: { select: { rating: true } } }
    }),
    prisma.product.count({ where })
  ])

  res.json({ products, total, page, pages: Math.ceil(total / limit) })
}
