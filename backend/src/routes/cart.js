const router = require('express').Router()
const db = require('../database/db')
const auth = require('../middleware/auth')

function getCart(userId) {
  const items = db.prepare(`
    SELECT ci.id, ci.quantity, ci.size, ci.color,
           p.id as product_id, p.name_uz, p.name_ru, p.price, p.images
    FROM cart ci JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ?
  `).all(userId).map(i => ({
    id: i.id,
    quantity: i.quantity,
    size: i.size,
    color: i.color,
    subtotal: i.price * i.quantity,
    product: {
      id: i.product_id,
      name_uz: i.name_uz,
      name_ru: i.name_ru,
      price: i.price,
      images: JSON.parse(i.images || '[]'),
    }
  }))
  const total = items.reduce((s, i) => s + i.subtotal, 0)
  return { items, total, item_count: items.reduce((s, i) => s + i.quantity, 0) }
}

// GET /api/cart/:user_id
router.get('/:user_id', auth, (req, res) => {
  try {
    res.json(getCart(req.params.user_id))
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// POST /api/cart/:user_id/add
router.post('/:user_id/add', auth, (req, res) => {
  try {
    const { product_id, quantity = 1, size, color } = req.query
    if (!product_id) return res.status(400).json({ detail: 'product_id kerak' })

    // Check stock
    if (size && color) {
      const stock = db.prepare('SELECT SUM(quantity) as qty FROM inventory WHERE product_id = ? AND size = ? AND color = ?').get(product_id, size, color)
      if (!stock?.qty || stock.qty < Number(quantity)) return res.status(400).json({ detail: `Omborda yetarli mahsulot yo'q (${stock?.qty || 0} ta)` })
    }

    const existing = db.prepare('SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ? AND size IS ? AND color IS ?').get(req.params.user_id, product_id, size || null, color || null)
    if (existing) {
      db.prepare('UPDATE cart SET quantity = quantity + ? WHERE id = ?').run(Number(quantity), existing.id)
    } else {
      db.prepare('INSERT INTO cart (user_id, product_id, quantity, size, color) VALUES (?, ?, ?, ?, ?)').run(req.params.user_id, product_id, Number(quantity), size || null, color || null)
    }
    res.json(getCart(req.params.user_id))
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// PATCH /api/cart/:user_id/item/:item_id
router.patch('/:user_id/item/:item_id', auth, (req, res) => {
  try {
    const { quantity } = req.query
    db.prepare('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?').run(Number(quantity), req.params.item_id, req.params.user_id)
    res.json(getCart(req.params.user_id))
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// DELETE /api/cart/:user_id/item/:item_id
router.delete('/:user_id/item/:item_id', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM cart WHERE id = ? AND user_id = ?').run(req.params.item_id, req.params.user_id)
    res.json(getCart(req.params.user_id))
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// DELETE /api/cart/:user_id/clear
router.delete('/:user_id/clear', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM cart WHERE user_id = ?').run(req.params.user_id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

module.exports = router
