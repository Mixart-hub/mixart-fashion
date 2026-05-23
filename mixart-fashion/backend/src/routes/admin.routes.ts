import { Router } from 'express'
import { stats, listUsers, listOrders, updateOrderStatus } from '../controllers/admin.controller'
import { requireAuth, requireAdmin } from '../middleware/auth.middleware'

const router = Router()

router.use(requireAuth, requireAdmin)
router.get('/stats', stats)
router.get('/users', listUsers)
router.get('/orders', listOrders)
router.put('/orders/:id/status', updateOrderStatus)

export default router
