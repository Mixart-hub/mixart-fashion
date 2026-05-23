import { Router } from 'express'
import { list, getOne, create, update, remove } from '../controllers/products.controller'
import { requireAuth, requireAdmin } from '../middleware/auth.middleware'

const router = Router()

router.get('/', list)
router.get('/:id', getOne)
router.post('/', requireAuth, requireAdmin, create)
router.put('/:id', requireAuth, requireAdmin, update)
router.delete('/:id', requireAuth, requireAdmin, remove)

export default router
