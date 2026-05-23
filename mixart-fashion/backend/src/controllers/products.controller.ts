import { Request, Response } from 'express'
import { prisma } from '../models/prisma'

export async function list(_req: Request, res: Response) {
  const products = await prisma.product.findMany({ where: { isActive: true } })
  res.json(products)
}

export async function getOne(req: Request, res: Response) {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } })
  if (!product) return res.status(404).json({ error: 'Not found' })
  res.json(product)
}

export async function create(req: Request, res: Response) {
  const product = await prisma.product.create({ data: req.body })
  res.status(201).json(product)
}

export async function update(req: Request, res: Response) {
  const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body })
  res.json(product)
}

export async function remove(req: Request, res: Response) {
  await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } })
  res.json({ success: true })
}
