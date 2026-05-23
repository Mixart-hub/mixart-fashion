const router = require('express').Router()
const db = require('../database/db')
const auth = require('../middleware/auth')

// PUT /api/users/:id
router.put('/:id', auth, (req, res) => {
  try {
    const { full_name, phone, language } = req.body
    db.prepare('UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), language = COALESCE(?, language) WHERE id = ?')
      .run(full_name || null, phone || null, language || null, req.params.id)
    const user = db.prepare('SELECT id, email, full_name, phone, role, language, loyalty_points, referral_code FROM users WHERE id = ?').get(req.params.id)
    if (!user) return res.status(404).json({ detail: 'Foydalanuvchi topilmadi' })
    res.json(user)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/users/:id/loyalty
router.get('/:id/loyalty', (req, res) => {
  try {
    const user = db.prepare('SELECT loyalty_points, referral_code FROM users WHERE id = ?').get(req.params.id)
    if (!user) return res.status(404).json({ detail: 'Foydalanuvchi topilmadi' })

    const points = user.loyalty_points || 0
    const totalSpent = db.prepare("SELECT COALESCE(SUM(final_amount),0) as s FROM orders WHERE user_id = ? AND status != 'cancelled'").get(req.params.id).s

    let level = 'bronze', nextLevel = 'silver', nextThreshold = 500000, discountPercent = 0
    if (totalSpent >= 2000000) {
      level = 'gold'; nextLevel = null; nextThreshold = null; discountPercent = 10
    } else if (totalSpent >= 500000) {
      level = 'silver'; nextLevel = 'gold'; nextThreshold = 2000000; discountPercent = 5
    }

    const progress = nextThreshold ? Math.min(100, Math.round((totalSpent / nextThreshold) * 100)) : 100

    res.json({
      points,
      level,
      next_level: nextLevel,
      next_threshold: nextThreshold,
      total_spent: totalSpent,
      discount_percent: discountPercent,
      progress,
      referral_code: user.referral_code,
    })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

module.exports = router
