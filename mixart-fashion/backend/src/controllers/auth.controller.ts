import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../models/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

function signToken(userId: string, role: string) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: '7d' })
}

export async function register(req: Request, res: Response) {
  const { name, email, phone, password } = req.body
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { name, email, phone, passwordHash } })
  const token = signToken(user.id, user.role)
  await prisma.session.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7 * 86400_000) }
  })
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } })
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.passwordHash) return res.status(401).json({ error: 'Invalid credentials' })
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
  const token = signToken(user.id, user.role)
  await prisma.session.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7 * 86400_000) }
  })
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } })
}

export async function telegramAuth(req: Request, res: Response) {
  const { id, first_name, username } = req.body
  let user = await prisma.user.findUnique({ where: { telegramId: String(id) } })
  if (!user) {
    user = await prisma.user.create({
      data: { telegramId: String(id), name: first_name || username || 'User' }
    })
  }
  const token = signToken(user.id, user.role)
  await prisma.session.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7 * 86400_000) }
  })
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } })
}

export async function refresh(_req: Request, res: Response) {
  res.json({ message: 'TODO: implement refresh token' })
}

export async function logout(req: AuthRequest, res: Response) {
  const token = req.headers.authorization?.split(' ')[1]
  if (token) await prisma.session.deleteMany({ where: { token } })
  res.json({ success: true })
}
