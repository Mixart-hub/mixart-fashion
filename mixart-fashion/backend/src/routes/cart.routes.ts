import { Router } from 'express'
import { getCart, addItem, updateItem, removeItem, clearCart } from '../controllers/cart.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()
router.use(requireAuth)
router.get('/', getCart)
router.post('/items', addItem)
router.patch('/items/:itemId', updateItem)
router.delete('/items/:itemId', removeItem)
router.delete('/', clearCart)
export default router
