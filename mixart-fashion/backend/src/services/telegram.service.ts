import TelegramBot from 'node-telegram-bot-api'
import { prisma } from '../models/prisma'
import { createNotification } from '../controllers/notifications.controller'
import { awardPoints } from '../controllers/loyalty.controller'

class TelegramService {
  private bot: TelegramBot

  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false })
    this.setupCommands()
  }

  private async setupCommands() {
    await this.bot.setMyCommands([
      { command: 'start',    description: 'Botni boshlash' },
      { command: 'shop',     description: 'Do\'konni ochish' },
      { command: 'orders',   description: 'Buyurtmalarim' },
      { command: 'profile',  description: 'Profilim' },
      { command: 'loyalty',  description: 'Bonus ballarim' },
      { command: 'branches', description: 'Filiallar' },
      { command: 'help',     description: 'Yordam' },
    ])
  }

  async handleUpdate(update: TelegramBot.Update) {
    const msg = update.message
    const query = update.callback_query

    if (query) return this.handleCallback(query)
    if (!msg) return

    const chatId = msg.chat.id
    const text = msg.text || ''
    const telegramId = String(msg.from?.id)

    if (text === '/start' || text.startsWith('/start ')) {
      await this.handleStart(chatId, telegramId, msg.from?.first_name)
    } else if (text === '/shop') {
      await this.sendShopButton(chatId)
    } else if (text === '/orders') {
      await this.sendOrders(chatId, telegramId)
    } else if (text === '/profile') {
      await this.sendProfile(chatId, telegramId)
    } else if (text === '/loyalty') {
      await this.sendLoyalty(chatId, telegramId)
    } else if (text === '/branches') {
      await this.sendBranches(chatId)
    } else if (text === '/help') {
      await this.sendHelp(chatId)
    }
  }

  private async handleStart(chatId: number, telegramId: string, firstName?: string) {
    let user = await prisma.user.findUnique({ where: { telegramId } })
    if (!user) {
      user = await prisma.user.create({
        data: { telegramId, name: firstName || 'Foydalanuvchi' }
      })
      await awardPoints(user.id, 100, 'BONUS', undefined, 'Botga qo\'shilganlik uchun bonus')
      await createNotification(user.id, 'LOYALTY', 'Xush kelibsiz!', '100 bonus ball berildi!')
    }

    const greeting = `👗 *Mixart Fashion*ga xush kelibsiz, ${firstName || 'do\'stim'}!\n\n` +
      `🛍 Eng yangi va chiroyli kiyimlar sizni kutmoqda!\n` +
      `💎 Har xaridda bonus ball yig'ing\n` +
      `🚚 Toshkent, Samarqand, Buxoro bo'ylab yetkazib berish\n\n` +
      `Do'konimizni ochish uchun quyidagi tugmani bosing 👇`

    await this.bot.sendMessage(chatId, greeting, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛍 Do\'konni ochish', web_app: { url: process.env.FRONTEND_URL! } }],
          [
            { text: '📦 Buyurtmalar', callback_data: 'orders' },
            { text: '💎 Ballarim', callback_data: 'loyalty' }
          ],
          [{ text: '📍 Filiallar', callback_data: 'branches' }]
        ]
      }
    })
  }

  private async sendShopButton(chatId: number) {
    await this.bot.sendMessage(chatId, '🛍 Do\'konimizni oching:', {
      reply_markup: {
        inline_keyboard: [[
          { text: '🛍 Mixart Fashion', web_app: { url: process.env.FRONTEND_URL! } }
        ]]
      }
    })
  }

  private async sendOrders(chatId: number, telegramId: string) {
    const user = await prisma.user.findUnique({ where: { telegramId } })
    if (!user) return this.bot.sendMessage(chatId, '❗ Avval ro\'yxatdan o\'ting.')

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    if (!orders.length) {
      return this.bot.sendMessage(chatId, '📦 Buyurtmalaringiz yo\'q.\n\nDo\'konimizdan xarid qiling!', {
        reply_markup: {
          inline_keyboard: [[{ text: '🛍 Do\'konni ochish', web_app: { url: process.env.FRONTEND_URL! } }]]
        }
      })
    }

    const statusEmoji: Record<string, string> = {
      PENDING: '⏳', CONFIRMED: '✅', PROCESSING: '🔄',
      SHIPPED: '🚚', DELIVERED: '📬', CANCELLED: '❌'
    }

    let text = '📦 *So\'nggi buyurtmalaringiz:*\n\n'
    for (const order of orders) {
      const emoji = statusEmoji[order.status] || '📦'
      const total = (order.total / 100).toLocaleString()
      text += `${emoji} #${order.id.slice(0, 8)} — ${total} so'm\n`
      text += `   Status: ${order.status}\n`
      text += `   Sana: ${order.createdAt.toLocaleDateString('uz-UZ')}\n\n`
    }

    await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
  }

  private async sendProfile(chatId: number, telegramId: string) {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { name: true, email: true, phone: true, loyaltyPoints: true, createdAt: true }
    })
    if (!user) return this.bot.sendMessage(chatId, '❗ Profil topilmadi.')

    const text = `👤 *Profilingiz*\n\n` +
      `Ism: ${user.name}\n` +
      (user.email ? `Email: ${user.email}\n` : '') +
      (user.phone ? `Tel: ${user.phone}\n` : '') +
      `💎 Bonus ball: ${user.loyaltyPoints}\n` +
      `📅 A'zo bo'lgan: ${user.createdAt.toLocaleDateString('uz-UZ')}`

    await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
  }

  private async sendLoyalty(chatId: number, telegramId: string) {
    const user = await prisma.user.findUnique({ where: { telegramId } })
    if (!user) return this.bot.sendMessage(chatId, '❗ Avval ro\'yxatdan o\'ting.')

    const txs = await prisma.loyaltyTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    const typeEmoji: Record<string, string> = {
      EARNED: '➕', SPENT: '➖', BONUS: '🎁', EXPIRED: '⌛'
    }

    let text = `💎 *Bonus ballaringiz: ${user.loyaltyPoints}*\n\n`
    if (txs.length) {
      text += '*So\'nggi harakatlar:*\n'
      for (const tx of txs) {
        const sign = tx.points > 0 ? '+' : ''
        text += `${typeEmoji[tx.type]} ${sign}${tx.points} ball`
        if (tx.note) text += ` — ${tx.note}`
        text += `\n`
      }
    }

    await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
  }

  private async sendBranches(chatId: number) {
    const branches = await prisma.branch.findMany({ where: { isActive: true } })

    let text = '📍 *Bizning filiallar:*\n\n'
    for (const b of branches) {
      text += `🏪 *${b.nameUz}*\n`
      text += `📍 ${b.address}\n`
      if (b.phone) text += `📞 ${b.phone}\n`
      if (b.lat && b.lng) text += `🗺 [Xaritada ko'rish](https://maps.google.com/?q=${b.lat},${b.lng})\n`
      text += '\n'
    }

    await this.bot.sendMessage(chatId, text || 'Filiallar topilmadi.', { parse_mode: 'Markdown' })
  }

  private async sendHelp(chatId: number) {
    const text = `ℹ️ *Mixart Fashion Bot Yordami*\n\n` +
      `/start — Botni boshlash\n` +
      `/shop — Do'konni ochish\n` +
      `/orders — Buyurtmalarim\n` +
      `/profile — Profilim\n` +
      `/loyalty — Bonus ballarim\n` +
      `/branches — Filiallar\n\n` +
      `📞 Aloqa: @mixart_support`

    await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
  }

  private async handleCallback(query: TelegramBot.CallbackQuery) {
    const chatId = query.message?.chat.id
    const telegramId = String(query.from.id)
    if (!chatId) return

    await this.bot.answerCallbackQuery(query.id)

    if (query.data === 'orders') await this.sendOrders(chatId, telegramId)
    else if (query.data === 'loyalty') await this.sendLoyalty(chatId, telegramId)
    else if (query.data === 'branches') await this.sendBranches(chatId)
    else if (query.data === 'profile') await this.sendProfile(chatId, telegramId)
  }

  async sendOrderNotification(chatId: string, orderId: string, status: string) {
    const statusEmoji: Record<string, string> = {
      PENDING: '⏳', CONFIRMED: '✅', PROCESSING: '🔄',
      SHIPPED: '🚚', DELIVERED: '📬', CANCELLED: '❌'
    }
    const statusUz: Record<string, string> = {
      PENDING: 'Kutilmoqda', CONFIRMED: 'Tasdiqlandi', PROCESSING: 'Tayyorlanmoqda',
      SHIPPED: 'Yetkazilmoqda', DELIVERED: 'Yetkazildi', CANCELLED: 'Bekor qilindi'
    }
    const emoji = statusEmoji[status] || '📦'
    const text = `${emoji} *Buyurtma holati o'zgardi*\n\n` +
      `#${orderId.slice(0, 8)}\n` +
      `Yangi status: *${statusUz[status] || status}*`

    await this.bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '📦 Buyurtmani ko\'rish', web_app: { url: `${process.env.FRONTEND_URL}/orders/${orderId}` } }
        ]]
      }
    })
  }

  async sendPaymentConfirmation(chatId: string, orderId: string, amount: number, provider: string) {
    const text = `✅ *To'lov muvaffaqiyatli qabul qilindi!*\n\n` +
      `Buyurtma: #${orderId.slice(0, 8)}\n` +
      `Summa: ${(amount / 100).toLocaleString()} so'm\n` +
      `To'lov tizimi: ${provider}`

    await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
  }

  async setWebhook(url: string) {
    await this.bot.setWebHook(`${url}/api/telegram/webhook`)
  }

  async sendBroadcast(message: string, userIds?: string[]) {
    const users = userIds
      ? await prisma.user.findMany({ where: { id: { in: userIds }, telegramId: { not: null } } })
      : await prisma.user.findMany({ where: { telegramId: { not: null } } })

    const results = await Promise.allSettled(
      users.map(u => u.telegramId
        ? this.bot.sendMessage(u.telegramId, message, { parse_mode: 'Markdown' })
        : Promise.resolve()
      )
    )
    const sent = results.filter(r => r.status === 'fulfilled').length
    return { total: users.length, sent }
  }
}

export const telegramService = new TelegramService()
