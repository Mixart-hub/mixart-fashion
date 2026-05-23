import { Router } from 'express'
import { getLoyalty } from '../controllers/loyalty.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()
router.use(requireAuth)
router.get('/', getLoyalty)
export default router
