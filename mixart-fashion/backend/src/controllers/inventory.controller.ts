import { Request, Response } from 'express'
import { prisma } from '../models/prisma'

export async function getBranches(_req: Request, res: Response) {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    include: { staff: { where: { isActive: true } } }
  })
  res.json(branches)
}

export async function createBranch(req: Request, res: Response) {
  const branch = await prisma.branch.create({ data: req.body })
  res.status(201).json(branch)
}

export async function updateBranch(req: Request, res: Response) {
  const branch = await prisma.branch.update({ where: { id: req.params.id }, data: req.body })
  res.json(branch)
}

export async function getProductInventory(req: Request, res: Response) {
  const inventory = await prisma.inventory.findMany({
    where: { productId: req.params.productId },
    include: { branch: true }
  })
  res.json(inventory)
}

export async function updateInventory(req: Request, res: Response) {
  const { productId, branchId, quantity } = req.body
  const inv = await prisma.inventory.upsert({
    where: { productId_branchId: { productId, branchId } },
    create: { productId, branchId, quantity },
    update: { quantity },
    include: { branch: true, product: true }
  })
  res.json(inv)
}

export async function getStockSummary(_req: Request, res: Response) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { inventory: { include: { branch: true } } },
    take: 100
  })
  res.json(products)
}
