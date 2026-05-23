const router = require('express').Router()
const db = require('../database/db')
const auth = require('../middleware/auth')

// GET /api/reviews?product_id=
router.get('/', (req, res) => {
  try {
    const { product_id, limit = 20 } = req.query
    if (!product_id) return res.status(400).json({ detail: 'product_id kerak' })
    const reviews = db.prepare('SELECT r.*, u.full_name FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC LIMIT ?').all(product_id, Number(limit))
    const avg = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE product_id = ?').get(product_id)
    res.json({ reviews, avg_rating: avg?.avg || 0, count: avg?.cnt || 0 })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// POST /api/reviews
router.post('/', auth, (req, res) => {
  try {
    const { product_id, rating, comment } = req.body
    if (!product_id || !rating) return res.status(400).json({ detail: 'product_id va rating kerak' })
    if (rating < 1 || rating > 5) return res.status(400).json({ detail: 'Rating 1-5 orasida' })

    db.prepare('INSERT OR REPLACE INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)').run(product_id, req.user.id, Number(rating), comment || null)

    const avg = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE product_id = ?').get(product_id)
    db.prepare('UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?').run(avg.avg || 0, avg.cnt || 0, product_id)

    res.status(201).json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

module.exports = router
