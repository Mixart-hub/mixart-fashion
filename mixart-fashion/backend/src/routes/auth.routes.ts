import { Router } from 'express'
import { login, register, telegramAuth, refresh, logout } from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/telegram', telegramAuth)
router.post('/refresh', refresh)
router.post('/logout', requireAuth, logout)

export default router
