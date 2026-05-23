import { Router } from 'express'
import { myOrders, getOne, create, cancel, updateStatus } from '../controllers/orders.controller'
import { requireAuth, requireAdmin } from '../middleware/auth.middleware'

const router = Router()

router.use(requireAuth)
router.get('/', myOrders)
router.get('/:id', getOne)
router.post('/', create)
router.post('/:id/cancel', cancel)
router.patch('/:id/status', requireAdmin, updateStatus)

export default router
