import { Router } from 'express'
import { getWishlist, addToWishlist, removeFromWishlist } from '../controllers/wishlist.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()
router.use(requireAuth)
router.get('/', getWishlist)
router.post('/', addToWishlist)
router.delete('/:productId', removeFromWishlist)
export default router
