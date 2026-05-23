const router = require('express').Router()
const db = require('../database/db')
const adminAuth = require('../middleware/adminAuth')

const BRANCH_ROLES = ['branch_manager', 'seller', 'operator']
const isBranch = (role) => BRANCH_ROLES.includes(role)

// GET /api/inventory
router.get('/', adminAuth, (req, res) => {
  try {
    const { search, sort } = req.query
    const INV_SORT = {
      name_asc:  'p.name_uz ASC, i.size, i.color',
      sku_asc:   'p.sku ASC NULLS LAST, i.size, i.color',
      qty_asc:   'i.quantity ASC',
      qty_desc:  'i.quantity DESC',
    }
    // Branch staff forced to their own branch; admins can filter freely
    const branch_id = isBranch(req.user.role) ? req.user.branch_id : req.query.branch_id

    let sql = `SELECT i.*, p.name_uz, p.name_ru, p.sku, p.images, b.name as branch_name
               FROM inventory i
               JOIN products p ON i.product_id = p.id
               JOIN branches b ON i.branch_id = b.id
               WHERE 1=1`
    const params = []
    if (branch_id) { sql += ' AND i.branch_id = ?'; params.push(branch_id) }
    if (search)    { sql += ' AND (p.name_uz LIKE ? OR p.sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
    sql += ` ORDER BY ${INV_SORT[sort] || INV_SORT.name_asc}`
    const items = db.prepare(sql).all(params).map(i => ({ ...i, images: JSON.parse(i.images || '[]') }))
    res.json(items)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// PUT /api/inventory/:id  (qty adjust)
router.put('/:id', adminAuth, (req, res) => {
  try {
    const { quantity, min_stock, delta } = req.body
    // delta: +/- quick adjust; quantity: absolute set
    if (delta !== undefined) {
      const row = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id)
      if (!row) return res.status(404).json({ detail: 'Topilmadi' })
      if (isBranch(req.user.role) && row.branch_id !== req.user.branch_id)
        return res.status(403).json({ detail: 'Ruxsat yo\'q' })
      const newQty = Math.max(0, (row.quantity || 0) + Number(delta))
      db.prepare('UPDATE inventory SET quantity = ? WHERE id = ?').run(newQty, req.params.id)
      return res.json({ success: true, quantity: newQty })
    }
    if (isBranch(req.user.role)) {
      const row = db.prepare('SELECT branch_id FROM inventory WHERE id = ?').get(req.params.id)
      if (row && row.branch_id !== req.user.branch_id)
        return res.status(403).json({ detail: 'Ruxsat yo\'q' })
    }
    db.prepare('UPDATE inventory SET quantity = COALESCE(?, quantity), min_stock = COALESCE(?, min_stock) WHERE id = ?').run(quantity ?? null, min_stock ?? null, req.params.id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// POST /api/inventory/add
router.post('/add', adminAuth, (req, res) => {
  try {
    const { product_id, size, color, quantity } = req.body
    // Branch staff can only add to their own branch
    const branch_id = isBranch(req.user.role) ? req.user.branch_id : req.body.branch_id
    if (!product_id || !branch_id || !size || !color) return res.status(400).json({ detail: 'Barcha maydonlar kerak' })

    const existing = db.prepare('SELECT id FROM inventory WHERE product_id = ? AND branch_id = ? AND size = ? AND color = ?').get(product_id, branch_id, size, color)
    if (existing) {
      db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?').run(Number(quantity || 0), existing.id)
    } else {
      db.prepare('INSERT INTO inventory (product_id, branch_id, size, color, quantity) VALUES (?, ?, ?, ?, ?)').run(product_id, branch_id, size, color, Number(quantity || 0))
    }
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// POST /api/inventory/transfer  (admin only)
router.post('/transfer', adminAuth, (req, res) => {
  try {
    if (isBranch(req.user.role)) return res.status(403).json({ detail: 'Filiallar arasi o\'tkazish faqat admin uchun' })

    const { product_id, from_branch, to_branch, quantity, size, color } = req.body
    const qty = Number(quantity || 0)
    if (qty <= 0) return res.status(400).json({ detail: 'Miqdor 0 dan katta bo\'lishi kerak' })

    const src = db.prepare('SELECT * FROM inventory WHERE product_id = ? AND branch_id = ? AND size = ? AND color = ?').get(product_id, from_branch, size, color)
    if (!src || src.quantity < qty) return res.status(400).json({ detail: 'Manba filialda yetarli mahsulot yo\'q' })

    db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE id = ?').run(qty, src.id)

    const dest = db.prepare('SELECT id FROM inventory WHERE product_id = ? AND branch_id = ? AND size = ? AND color = ?').get(product_id, to_branch, size, color)
    if (dest) {
      db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?').run(qty, dest.id)
    } else {
      db.prepare('INSERT INTO inventory (product_id, branch_id, size, color, quantity) VALUES (?, ?, ?, ?, ?)').run(product_id, to_branch, size, color, qty)
    }
    res.json({ success: true, transferred: qty })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/inventory/overview
router.get('/overview', adminAuth, (req, res) => {
  try {
    const bid = isBranch(req.user.role) ? req.user.branch_id : null
    const base = bid
      ? 'SELECT {sel} FROM inventory WHERE branch_id = ?'
      : 'SELECT {sel} FROM inventory WHERE 1=1'
    const p = bid ? [bid] : []
    const q = (sel, extra = '') => db.prepare(base.replace('{sel}', sel) + extra).get(p)
    const total_items     = q('COALESCE(SUM(quantity),0) as n').n
    const low_stock_count = q('COUNT(*) as n', ' AND quantity < min_stock AND quantity > 0').n
    const out_of_stock    = q('COUNT(*) as n', ' AND quantity = 0').n
    const branches        = db.prepare('SELECT b.name, SUM(i.quantity) as total FROM inventory i JOIN branches b ON i.branch_id = b.id GROUP BY b.id').all()
    res.json({ total_items, low_stock_count, out_of_stock, by_branch: branches })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

module.exports = router
