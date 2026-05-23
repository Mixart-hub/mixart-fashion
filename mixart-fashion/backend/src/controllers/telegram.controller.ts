import { Request, Response } from 'express'
import { telegramService } from '../services/telegram.service'

export async function webhook(req: Request, res: Response) {
  await telegramService.handleUpdate(req.body)
  res.sendStatus(200)
}
