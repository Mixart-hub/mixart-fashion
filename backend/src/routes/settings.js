const router = require('express').Router()
const https = require('https')
const db = require('../database/db')
const adminAuth = require('../middleware/adminAuth')

const ADMIN_ROLES = ['admin', 'super_admin']
const isAdmin = (role) => ADMIN_ROLES.includes(role)

// GET /api/settings
router.get('/', adminAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))
    res.json(settings)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// PUT /api/settings
router.put('/', adminAuth, (req, res) => {
  try {
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    Object.entries(req.body).forEach(([k, v]) => upsert.run(k, String(v)))
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/settings/branches
router.get('/branches', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM branches ORDER BY id').all())
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// POST /api/settings/branches
router.post('/branches', adminAuth, (req, res) => {
  try {
    const { name, address, phone, latitude, longitude } = req.body
    db.prepare('INSERT INTO branches (name, address, phone, latitude, longitude) VALUES (?, ?, ?, ?, ?)').run(name, address, phone, latitude || null, longitude || null)
    res.status(201).json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/settings/promo-codes
router.get('/promo-codes', adminAuth, (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM discount_codes ORDER BY created_at DESC').all())
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// POST /api/settings/promo-codes
router.post('/promo-codes', adminAuth, (req, res) => {
  try {
    const { code, discount_percent, expires_at } = req.body
    db.prepare('INSERT INTO discount_codes (code, discount_percent, expires_at) VALUES (?, ?, ?)').run(code.toUpperCase(), discount_percent, expires_at || null)
    res.status(201).json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/settings/product-fields  (admin+)
router.get('/product-fields', adminAuth, (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'product_field_config'").get()
    res.json(row ? JSON.parse(row.value) : {})
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// PUT /api/settings/product-fields  (super_admin only)
router.put('/product-fields', adminAuth, (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ detail: 'Faqat super_admin uchun' })
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('product_field_config', ?)").run(JSON.stringify(req.body))
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// PUT /api/settings/telegram-bot  (admin only)
router.put('/telegram-bot', adminAuth, (req, res) => {
  try {
    if (!isAdmin(req.user.role)) return res.status(403).json({ detail: 'Faqat admin va super_admin uchun' })
    const { token, chat_id } = req.body
    if (!token || !token.trim()) return res.status(400).json({ detail: 'Token kerak' })
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    upsert.run('telegram_bot_token', token.trim())
    if (chat_id !== undefined) upsert.run('telegram_chat_id', String(chat_id).trim())
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// POST /api/settings/telegram-bot/test  (admin only)
router.post('/telegram-bot/test', adminAuth, (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ detail: 'Faqat admin va super_admin uchun' })
  const { token } = req.body
  const testToken = (token || '').trim() ||
    (db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get()?.value || '')
  if (!testToken) return res.status(400).json({ ok: false, message: "Token yo'q — avval saqlang" })

  https.get(`https://api.telegram.org/bot${testToken}/getMe`, (resp) => {
    let data = ''
    resp.on('data', chunk => { data += chunk })
    resp.on('end', () => {
      try {
        const parsed = JSON.parse(data)
        if (parsed.ok) {
          res.json({ ok: true, bot: parsed.result })
        } else {
          res.json({ ok: false, message: parsed.description || "Token noto'g'ri" })
        }
      } catch { res.status(500).json({ ok: false, message: "Javob o'qilmadi" }) }
    })
  }).on('error', e => res.status(500).json({ ok: false, message: e.message }))
})

// GET /api/settings/promo/check/:code
router.get('/promo/check/:code', (req, res) => {
  try {
    const promo = db.prepare('SELECT * FROM discount_codes WHERE code = ? AND is_active = 1').get(req.params.code.toUpperCase())
    if (!promo) return res.json({ valid: false, message: 'Promo kod topilmadi' })
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) return res.json({ valid: false, message: 'Promo kodning muddati o\'tgan' })
    res.json({ valid: true, discount_percent: promo.discount_percent, code: promo.code })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

module.exports = router
