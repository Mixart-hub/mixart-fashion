import { Router } from 'express'
import {
  initPayme, paymeWebhook,
  initClick, clickWebhook,
  getPaymentStatus, initiatePayment
} from '../controllers/payments.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

// User-facing: generate payment URL
router.post('/initiate', requireAuth, initiatePayment)
router.post('/payme/init', requireAuth, initPayme)
router.post('/click/init', requireAuth, initClick)
router.get('/status/:orderId', requireAuth, getPaymentStatus)

// Provider webhooks (no auth — verified by signature/basic-auth inside handler)
router.post('/payme/webhook', paymeWebhook)
router.post('/click/webhook', clickWebhook)

export default router
