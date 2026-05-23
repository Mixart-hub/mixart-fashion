const { Telegraf, Markup } = require('telegraf')
const db = require('../database/db')
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.node') })

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn('⚠️  TELEGRAM_BOT_TOKEN not set — bot disabled')
  module.exports = null
  return
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
const TWA_URL = process.env.TWA_URL || 'http://localhost:3000'

const mainMenu = (lang = 'uz') => {
  const labels = {
    uz: ['🛍 Katalog', '🛒 Savat', '📦 Buyurtmalar', '👤 Profil', '📍 Filiallar', '✨ AI Stilist'],
    ru: ['🛍 Каталог', '🛒 Корзина', '📦 Заказы', '👤 Профиль', '📍 Филиалы', '✨ AI Стилист'],
    en: ['🛍 Catalog', '🛒 Cart', '📦 Orders', '👤 Profile', '📍 Branches', '✨ AI Stylist'],
  }
  return Markup.keyboard([
    [labels[lang]?.[0] || labels.uz[0], labels[lang]?.[1] || labels.uz[1]],
    [labels[lang]?.[2] || labels.uz[2], labels[lang]?.[3] || labels.uz[3]],
    [labels[lang]?.[4] || labels.uz[4], labels[lang]?.[5] || labels.uz[5]],
  ]).resize()
}

bot.command('start', ctx => {
  const tgUser = ctx.from
  const lang = ['ru', 'en'].includes(tgUser?.language_code) ? tgUser.language_code : 'uz'
  const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')

  const msgs = {
    uz: `Assalomu alaykum, *${name}*! 👋\n\nMixart Fashion ga xush kelibsiz! 🌹\n\nZamonaviy moda va premium sifat — barchasi bir joyda.`,
    ru: `Добро пожаловать, *${name}*! 👋\n\nДобро пожаловать в Mixart Fashion! 🌹\n\nСовременная мода и премиум качество — всё в одном месте.`,
    en: `Welcome, *${name}*! 👋\n\nWelcome to Mixart Fashion! 🌹\n\nModern fashion and premium quality — all in one place.`,
  }

  ctx.reply(msgs[lang] || msgs.uz, {
    parse_mode: 'Markdown',
    ...mainMenu(lang),
  })

  // Register user in DB
  if (tgUser?.id) {
    const existing = db.prepare('SELECT id FROM users WHERE telegram_id = ?').get(String(tgUser.id))
    if (!existing) {
      const { v4: uuidv4 } = require('uuid')
      const refCode = 'MXF' + Math.random().toString(36).slice(2, 8).toUpperCase()
      db.prepare('INSERT OR IGNORE INTO users (id, full_name, telegram_id, language, referral_code) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), name, String(tgUser.id), lang, refCode)
    }
  }
})

bot.command('catalog', ctx => {
  ctx.reply('🛍 Katalogni ochish:', Markup.inlineKeyboard([
    [Markup.button.webApp('Katalogni ko\'rish', `${TWA_URL}/catalog`)]
  ]))
})

bot.command('cart', ctx => {
  ctx.reply('🛒 Savatingizni ko\'rish:', Markup.inlineKeyboard([
    [Markup.button.webApp('Savatni ochish', `${TWA_URL}/cart`)]
  ]))
})

bot.command('orders', ctx => {
  ctx.reply('📦 Buyurtmalaringizni ko\'rish:', Markup.inlineKeyboard([
    [Markup.button.webApp('Buyurtmalar', `${TWA_URL}/orders`)]
  ]))
})

bot.command('profile', ctx => {
  ctx.reply('👤 Profilingizni ko\'rish:', Markup.inlineKeyboard([
    [Markup.button.webApp('Profil', `${TWA_URL}/profile`)]
  ]))
})

bot.hears(['🛍 Katalog', '🛍 Каталог', '🛍 Catalog'], ctx => {
  ctx.reply('Katalogni ochish 👇', Markup.inlineKeyboard([[Markup.button.webApp('Ochish', `${TWA_URL}/catalog`)]]))
})

bot.hears(['🛒 Savat', '🛒 Корзина', '🛒 Cart'], ctx => {
  ctx.reply('Savatni ochish 👇', Markup.inlineKeyboard([[Markup.button.webApp('Ochish', `${TWA_URL}/cart`)]]))
})

bot.hears(['📦 Buyurtmalar', '📦 Заказы', '📦 Orders'], ctx => {
  ctx.reply('Buyurtmalarni ochish 👇', Markup.inlineKeyboard([[Markup.button.webApp('Ochish', `${TWA_URL}/orders`)]]))
})

bot.hears(['👤 Profil', '👤 Профиль', '👤 Profile'], ctx => {
  ctx.reply('Profilni ochish 👇', Markup.inlineKeyboard([[Markup.button.webApp('Ochish', `${TWA_URL}/profile`)]]))
})

bot.hears(['📍 Filiallar', '📍 Филиалы', '📍 Branches'], ctx => {
  const branches = db.prepare('SELECT * FROM branches').all()
  const text = branches.map(b => `📍 *${b.name}*\n${b.address}\n📞 ${b.phone}`).join('\n\n') || 'Filiallar yo\'q'
  ctx.reply(text, { parse_mode: 'Markdown' })
})

bot.on('callback_query', async ctx => {
  const data = ctx.callbackQuery?.data || ''

  if (data.startsWith('accept_')) {
    const orderId = data.slice(7)
    try {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
      if (!order) {
        await ctx.answerCbQuery('Buyurtma topilmadi', { show_alert: true })
        return
      }
      if (order.status !== 'new') {
        await ctx.answerCbQuery(`Buyurtma allaqachon: ${order.status}`, { show_alert: true })
        return
      }
      const telegramId = String(ctx.from?.id)
      const staff = db.prepare("SELECT * FROM staff WHERE telegram_id = ? AND is_active = 1").get(telegramId)

      db.prepare(`UPDATE orders SET status = 'processing',
        assigned_staff_id = COALESCE(?, assigned_staff_id),
        branch_id = COALESCE(?, branch_id),
        updated_at = datetime('now') WHERE id = ?`)
        .run(staff?.id || null, staff?.branch_id || null, orderId)

      const staffName = ctx.from?.first_name || staff?.name || 'Staff'
      try {
        const { logActivity } = require('../middleware/activityLogger')
        logActivity(staff?.id || null, staffName, 'UPDATE', 'order', orderId, `Status: new → processing (Telegram orqali)`)
      } catch {}

      const amt = order.final_amount
        ? Number(order.final_amount).toLocaleString('ru-RU') + " so'm"
        : "—"
      await ctx.editMessageText(
        `✅ *Qabul qilindi!*\n\n📋 ID: \`${orderId}\`\n💰 Summa: ${amt}\n👤 Mijoz: ${order.delivery_name || '—'}\n\n_${staffName} tomonidan qabul qilindi_`,
        { parse_mode: 'Markdown' }
      ).catch(() => {})
      await ctx.answerCbQuery('✅ Buyurtma qabul qilindi!')
    } catch (e) {
      console.error('accept callback error:', e.message)
      await ctx.answerCbQuery('Xato yuz berdi', { show_alert: true })
    }
    return
  }

  await ctx.answerCbQuery()
})

bot.catch((err, ctx) => {
  console.error('Bot error:', err.message)
})

bot.notifyNewOrder = async function(order) {
  try {
    const staffList = db.prepare(
      "SELECT * FROM staff WHERE is_active = 1 AND telegram_id IS NOT NULL AND role IN ('super_admin','admin','operator','branch_manager')"
    ).all()
    if (!staffList.length) return

    const amt = order.final_amount
      ? Number(order.final_amount).toLocaleString('ru-RU') + " so'm"
      : "—"
    const msg = [
      `🛍 *Yangi buyurtma keldi!*`,
      ``,
      `📋 ID: \`${order.id}\``,
      `💰 Summa: ${amt}`,
      `📍 Manzil: ${order.delivery_address || '—'}`,
      `👤 Mijoz: ${order.delivery_name || '—'}`,
      `📞 Telefon: ${order.delivery_phone || '—'}`,
      `💳 To'lov: ${order.payment_method || 'cash'}`,
    ].join('\n')

    for (const s of staffList) {
      try {
        await bot.telegram.sendMessage(s.telegram_id, msg, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Qabul qilish', callback_data: `accept_${order.id}` },
              { text: '📦 Admin panel', url: process.env.ADMIN_URL || 'http://localhost:3001' },
            ]]
          }
        })
      } catch {}
    }
  } catch (e) {
    console.error('notifyNewOrder error:', e.message)
  }
}

module.exports = bot
