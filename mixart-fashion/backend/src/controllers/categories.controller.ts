import { Request, Response } from 'express'
import { prisma } from '../models/prisma'

export async function list(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: { children: { where: { isActive: true } } },
    orderBy: { sortOrder: 'asc' }
  })
  res.json(categories)
}

export async function getBySlug(req: Request, res: Response) {
  const cat = await prisma.category.findUnique({
    where: { slug: req.params.slug },
    include: { children: true, products: { where: { isActive: true }, take: 20 } }
  })
  if (!cat) return res.status(404).json({ error: 'Not found' })
  res.json(cat)
}

export async function create(req: Request, res: Response) {
  const cat = await prisma.category.create({ data: req.body })
  res.status(201).json(cat)
}

export async function update(req: Request, res: Response) {
  const cat = await prisma.category.update({ where: { id: req.params.id }, data: req.body })
  res.json(cat)
}

export async function remove(req: Request, res: Response) {
  await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } })
  res.json({ success: true })
}
