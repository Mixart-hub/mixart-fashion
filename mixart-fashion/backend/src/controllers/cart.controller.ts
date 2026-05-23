import { Response } from 'express'
import { prisma } from '../models/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } }
  })
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: { items: { include: { product: true } } }
    })
  }
  return cart
}

export async function getCart(req: AuthRequest, res: Response) {
  const cart = await getOrCreateCart(req.userId!)
  res.json(cart)
}

export async function addItem(req: AuthRequest, res: Response) {
  const { productId, quantity = 1, size, color } = req.body
  const cart = await getOrCreateCart(req.userId!)

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return res.status(404).json({ error: 'Product not found' })

  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, size: size ?? null, color: color ?? null }
  })

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity }
    })
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity, size, color }
    })
  }

  const updated = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: { items: { include: { product: true } } }
  })
  res.json(updated)
}

export async function updateItem(req: AuthRequest, res: Response) {
  const { quantity } = req.body
  const cart = await prisma.cart.findUnique({ where: { userId: req.userId! } })
  if (!cart) return res.status(404).json({ error: 'Cart not found' })

  const item = await prisma.cartItem.findFirst({
    where: { id: req.params.itemId, cartId: cart.id }
  })
  if (!item) return res.status(404).json({ error: 'Item not found' })

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } })
  } else {
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } })
  }

  const updated = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: { items: { include: { product: true } } }
  })
  res.json(updated)
}

export async function removeItem(req: AuthRequest, res: Response) {
  const cart = await prisma.cart.findUnique({ where: { userId: req.userId! } })
  if (!cart) return res.status(404).json({ error: 'Cart not found' })

  await prisma.cartItem.deleteMany({
    where: { id: req.params.itemId, cartId: cart.id }
  })

  const updated = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: { items: { include: { product: true } } }
  })
  res.json(updated)
}

export async function clearCart(req: AuthRequest, res: Response) {
  const cart = await prisma.cart.findUnique({ where: { userId: req.userId! } })
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  res.json({ success: true })
}
