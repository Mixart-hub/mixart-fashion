import { Router } from 'express'
import { webhook } from '../controllers/telegram.controller'

const router = Router()

router.post('/webhook', webhook)

export default router
