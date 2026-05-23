import { Router } from 'express'
import {
  getBranches, createBranch, updateBranch,
  getProductInventory, updateInventory, getStockSummary
} from '../controllers/inventory.controller'
import { requireAuth, requireAdmin } from '../middleware/auth.middleware'

const router = Router()
router.get('/branches', getBranches)
router.post('/branches', requireAuth, requireAdmin, createBranch)
router.patch('/branches/:id', requireAuth, requireAdmin, updateBranch)
router.get('/product/:productId', getProductInventory)
router.post('/update', requireAuth, requireAdmin, updateInventory)
router.get('/stock', requireAuth, requireAdmin, getStockSummary)
export default router
