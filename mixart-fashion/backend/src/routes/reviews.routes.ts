import { Router } from 'express'
import { getProductReviews, createReview, deleteReview } from '../controllers/reviews.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()
router.get('/product/:productId', getProductReviews)
router.post('/', requireAuth, createReview)
router.delete('/:id', requireAuth, deleteReview)
export default router
