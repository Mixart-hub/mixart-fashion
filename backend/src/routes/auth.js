const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const db = require('../database/db')
const auth = require('../middleware/auth')

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '24h' })
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { email, full_name, password, phone, language = 'uz' } = req.body
    if (!email || !full_name || !password) return res.status(400).json({ detail: 'Email, ism va parol kerak' })

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) return res.status(409).json({ detail: 'Bu email allaqachon ro\'yxatdan o\'tgan' })

    const hash = bcrypt.hashSync(password, 10)
    const id = uuidv4()
    const refCode = 'MXF' + Math.random().toString(36).slice(2, 8).toUpperCase()

    db.prepare('INSERT INTO users (id, email, full_name, password_hash, phone, language, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, email, full_name, hash, phone || null, language, refCode)

    const user = db.prepare('SELECT id, email, full_name, phone, role, language, loyalty_points, referral_code FROM users WHERE id = ?').get(id)
    res.status(201).json({ access_token: sign(user), user })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ detail: 'Email va parol kerak' })

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user || !user.password_hash) return res.status(401).json({ detail: 'Email yoki parol noto\'g\'ri' })

    if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ detail: 'Email yoki parol noto\'g\'ri' })

    const { password_hash, ...safe } = user
    res.json({ access_token: sign(user), user: safe })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// POST /api/auth/telegram
router.post('/telegram', (req, res) => {
  try {
    const { telegram_id, full_name, language = 'uz', referral_code } = req.query
    if (!telegram_id) return res.status(400).json({ detail: 'telegram_id kerak' })

    let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id)
    if (!user) {
      const id = uuidv4()
      const refCode = 'MXF' + Math.random().toString(36).slice(2, 8).toUpperCase()
      db.prepare('INSERT INTO users (id, full_name, telegram_id, language, referral_code) VALUES (?, ?, ?, ?, ?)')
        .run(id, full_name || 'Telegram User', telegram_id, language, refCode)
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)

      // Referral bonus
      if (referral_code) {
        const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referral_code)
        if (referrer) db.prepare('UPDATE users SET loyalty_points = loyalty_points + 50 WHERE id = ?').run(referrer.id)
      }
    }
    const { password_hash, ...safe } = user
    res.json({ access_token: sign(user), user: safe })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, full_name, phone, role, language, loyalty_points, referral_code, profile_image, telegram_id FROM users WHERE id = ?').get(req.user.id)
    if (!user) return res.status(404).json({ detail: 'Foydalanuvchi topilmadi' })
    res.json(user)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// PUT /api/auth/profile
router.put('/profile', auth, (req, res) => {
  try {
    const { full_name, phone, language } = req.body
    db.prepare('UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), language = COALESCE(?, language) WHERE id = ?')
      .run(full_name || null, phone || null, language || null, req.user.id)
    const user = db.prepare('SELECT id, email, full_name, phone, role, language, loyalty_points, referral_code FROM users WHERE id = ?').get(req.user.id)
    res.json(user)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// PUT /api/auth/change-password
router.put('/change-password', auth, (req, res) => {
  try {
    const { current_password, new_password } = req.body
    if (!current_password || !new_password) return res.status(400).json({ detail: 'Joriy va yangi parol kerak' })
    if (new_password.length < 6) return res.status(400).json({ detail: 'Yangi parol kamida 6 ta belgi' })

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
    if (!user || !user.password_hash) return res.status(400).json({ detail: 'Parol o\'rnatilmagan' })

    if (!bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(400).json({ detail: 'Joriy parol noto\'g\'ri' })
    }

    const hash = bcrypt.hashSync(new_password, 10)
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id)
    res.json({ success: true, detail: 'Parol o\'zgartirildi' })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

module.exports = router
