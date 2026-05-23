import { Router } from 'express'
import { list, getBySlug, create, update, remove } from '../controllers/categories.controller'
import { requireAuth, requireAdmin } from '../middleware/auth.middleware'

const router = Router()
router.get('/', list)
router.get('/:slug', getBySlug)
router.post('/', requireAuth, requireAdmin, create)
router.patch('/:id', requireAuth, requireAdmin, update)
router.delete('/:id', requireAuth, requireAdmin, remove)
export default router
