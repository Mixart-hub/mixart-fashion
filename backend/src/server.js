require('dotenv').config({ path: require('path').join(__dirname, '../.env.node') })

const http    = require('http')
const express = require('express')
const cors    = require('cors')
const path    = require('path')
const { addClient, removeClient } = require('./events')
const { initSocket } = require('./socketServer')

const app = express()

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.ADMIN_URL    || 'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Static media ───────────────────────────────────────────────────────────
app.use('/media', express.static(path.join(__dirname, '../media')))

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'))
app.use('/api/users',     require('./routes/users'))
app.use('/api/products',  require('./routes/products'))
app.use('/api/cart',      require('./routes/cart'))
app.use('/api/orders',    require('./routes/orders'))
app.use('/api/admin',     require('./routes/admin'))
app.use('/api/inventory', require('./routes/inventory'))
app.use('/api/staff',     require('./routes/staff'))
app.use('/api/payments',  require('./routes/payments'))
app.use('/api/reviews',        require('./routes/reviews'))
app.use('/api/settings',       require('./routes/settings'))
app.use('/api/notifications',  require('./routes/notifications'))
app.use('/api/ai',             require('./routes/ai'))
app.use('/api/upload',        require('./routes/upload'))
app.use('/api/news',          require('./routes/news'))

// Public banners endpoint
app.get('/api/banners', (req, res) => {
  const db = require('./database/db')
  try {
    res.json(db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order, id').all())
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

// ── SSE (Server-Sent Events) ────────────────────────────────────────────────
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const id = Date.now() + Math.random().toString(36).slice(2)
  addClient(id, res)

  // Ping har 25 soniyada (proxy timeout dan qochish uchun)
  const ping = setInterval(() => {
    try { res.write(': ping\n\n') } catch { clearInterval(ping) }
  }, 25000)

  res.on('close', () => {
    clearInterval(ping)
    removeClient(id)
  })
})

// Promo check (shortcut)
app.get('/api/promo/check/:code', (req, res) => {
  const db = require('./database/db')
  const promo = db.prepare('SELECT * FROM discount_codes WHERE code = ? AND is_active = 1').get(req.params.code.toUpperCase())
  if (!promo) return res.json({ valid: false, message: 'Promo kod topilmadi' })
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return res.json({ valid: false, message: 'Muddati o\'tgan' })
  res.json({ valid: true, discount_percent: promo.discount_percent, code: promo.code })
})

// Flash sale stub (compatibility with existing frontend)
app.get('/api/flash-sales/active', (req, res) => res.json({ active: false }))

// System
app.get('/api/system/currency-rate', (req, res) => res.json({ usd_to_uzs: 12800 }))
app.get('/api/system', (req, res) => {
  const db = require('./database/db')
  const rows = db.prepare('SELECT key, value FROM settings').all()
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])))
})

// Telegram webhook
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const bot = require('./telegram/bot')
    if (bot) await bot.handleUpdate(req.body)
    res.json({ ok: true })
  } catch (e) {
    res.json({ ok: false })
  }
})

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', port: process.env.PORT || 5000, time: new Date().toISOString() }))

// 404
app.use((req, res) => res.status(404).json({ detail: `${req.method} ${req.path} — endpoint topilmadi` }))

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ detail: err.message })
})

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
const httpServer = http.createServer(app)
initSocket(httpServer)

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Mixart Node.js API — port ${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health`)
  console.log(`   Products: http://localhost:${PORT}/api/products`)
  console.log(`   Admin: http://localhost:${PORT}/api/admin/dashboard\n`)

  // Telegram bot: production=webhook, dev=polling
  try {
    const bot = require('./telegram/bot')
    if (bot) {
      const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL
      if (webhookUrl && process.env.NODE_ENV === 'production') {
        // Webhook URL ni Telegram ga ro'yxatdan o'tkazish
        bot.telegram.setWebhook(webhookUrl).then(() => {
          console.log(`🤖 Telegram bot webhook: ${webhookUrl}`)
        }).catch(e => console.warn('⚠️  Webhook set error:', e.message))
      } else {
        bot.launch({ dropPendingUpdates: true }).catch(e => {
          console.warn('⚠️  Bot polling error:', e.message)
        })
        console.log('🤖 Telegram bot started (polling)')
        process.once('SIGINT', () => bot.stop('SIGINT'))
        process.once('SIGTERM', () => bot.stop('SIGTERM'))
      }
    }
  } catch (e) {
    console.warn('⚠️  Bot start failed:', e.message)
  }
})

module.exports = { app, httpServer }
