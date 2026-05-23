import { Router } from 'express'
import { getNotifications, markRead, markAllRead } from '../controllers/notifications.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()
router.use(requireAuth)
router.get('/', getNotifications)
router.patch('/:id/read', markRead)
router.patch('/read-all', markAllRead)
export default router
