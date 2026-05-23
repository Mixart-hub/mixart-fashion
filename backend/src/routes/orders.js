const router = require('express').Router()
const db = require('../database/db')
const auth = require('../middleware/auth')
const { broadcast } = require('../events')

function orderId() {
  return 'MXF-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()
}

// POST /api/orders
router.post('/', auth, (req, res) => {
  try {
    const { customer_id, items, total_amount, delivery_amount = 20000, promo_code, delivery_address, delivery_name, delivery_phone, estimated_delivery, note, payment_method = 'cash' } = req.body

    if (!items || !items.length) return res.status(400).json({ detail: 'Buyurtma mahsulotlari kerak' })
    if (!delivery_address) return res.status(400).json({ detail: 'Yetkazib berish manzili kerak' })

    // Check promo
    let discountAmount = 0
    if (promo_code) {
      const promo = db.prepare('SELECT * FROM discount_codes WHERE code = ? AND is_active = 1').get(promo_code)
      if (promo) discountAmount = Math.round((total_amount * promo.discount_percent) / 100)
    }

    const finalAmount = (total_amount || 0) - discountAmount + Number(delivery_amount)
    const oid = orderId()

    db.prepare(`INSERT INTO orders (id, user_id, total_amount, final_amount, delivery_amount, discount_amount, status, payment_method, delivery_address, delivery_name, delivery_phone, estimated_delivery, promo_code, note)
      VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?)`).run(oid, customer_id, total_amount, finalAmount, delivery_amount, discountAmount, payment_method, delivery_address, delivery_name || null, delivery_phone || null, estimated_delivery || null, promo_code || null, note || null)

    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, size, color, price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    items.forEach(item => {
      const prod = db.prepare('SELECT name_uz FROM products WHERE id = ?').get(item.product_id)
      insertItem.run(oid, item.product_id, prod?.name_uz || '', item.quantity, item.size, item.color, item.price, item.price * item.quantity)
    })

    // Loyalty points
    if (customer_id) {
      const pts = Math.floor(finalAmount / 10000)
      db.prepare('UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?').run(pts, customer_id)
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(oid)
    broadcast('order_created', { id: oid, status: 'new', final_amount: finalAmount, delivery_address, payment_method })

    // Notify staff via Telegram (non-blocking)
    try {
      const bot = require('../telegram/bot')
      if (bot?.notifyNewOrder) bot.notifyNewOrder(order).catch(() => {})
    } catch {}

    res.status(201).json(order)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/orders
router.get('/', auth, (req, res) => {
  try {
    const { customer_id, limit = 50, skip = 0 } = req.query
    const userId = customer_id || req.user.id
    const items = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(userId, Number(limit), Number(skip))
    const ordersWithItems = items.map(o => ({
      ...o,
      items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id)
    }))
    const total = db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE user_id = ?').get(userId)?.cnt || 0
    res.json({ items: ordersWithItems, total })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/orders/:id
router.get('/:id', auth, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
    if (!order) return res.status(404).json({ detail: 'Buyurtma topilmadi' })
    const items = db.prepare('SELECT oi.*, p.images FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?').all(req.params.id).map(i => ({ ...i, images: JSON.parse(i.images || '[]') }))
    res.json({ ...order, items })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// PATCH /api/orders/:id/status
router.patch('/:id/status', auth, (req, res) => {
  try {
    const { new_status } = req.query
    const valid = ['new', 'processing', 'shipped', 'delivered', 'cancelled']
    if (!valid.includes(new_status)) return res.status(400).json({ detail: 'Noto\'g\'ri status' })
    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(new_status, req.params.id)
    broadcast('order_updated', { id: req.params.id, status: new_status })
    res.json({ success: true, status: new_status })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/orders/apply-promo
router.get('/apply-promo', auth, (req, res) => {
  try {
    const { code } = req.query
    if (!code) return res.status(400).json({ detail: 'Promo kod kerak' })
    const promo = db.prepare('SELECT * FROM discount_codes WHERE code = ? AND is_active = 1').get(code.toUpperCase())
    if (!promo) return res.json({ valid: false, message: 'Promo kod topilmadi yoki muddati o\'tgan' })
    res.json({ valid: true, discount_percent: promo.discount_percent, code: promo.code })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

module.exports = router
