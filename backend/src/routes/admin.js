const router = require('express').Router()
const db = require('../database/db')
const adminAuth = require('../middleware/adminAuth')
const { v4: uuidv4 } = require('uuid')
const { broadcast } = require('../events')
const { logActivity } = require('../middleware/activityLogger')

// GET /api/admin/dashboard
router.get('/dashboard', adminAuth, (req, res) => {
  try {
    const total_orders   = db.prepare('SELECT COUNT(*) as n FROM orders').get().n
    const revenue        = db.prepare("SELECT COALESCE(SUM(final_amount),0) as s FROM orders WHERE status != 'cancelled'").get().s
    const total_customers = db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'customer'").get().n
    const total_products  = db.prepare('SELECT COUNT(*) as n FROM products').get().n
    const pending_orders  = db.prepare("SELECT COUNT(*) as n FROM orders WHERE status = 'new'").get().n
    const recent_orders   = db.prepare('SELECT o.*, u.full_name FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 10').all()
    res.json({ total_orders, revenue, total_customers, total_products, pending_orders, recent_orders })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/admin/stats/top-categories
router.get('/stats/top-categories', adminAuth, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.name_uz as name, COUNT(p.id) as count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY count DESC
    `).all()
    const uncategorized = db.prepare("SELECT COUNT(*) as n FROM products WHERE category_id IS NULL").get().n
    if (uncategorized > 0) rows.push({ name: 'Boshqa', count: uncategorized })
    const total = rows.reduce((s, r) => s + r.count, 0)
    const result = rows.filter(r => r.count > 0).map(r => ({
      name: r.name,
      count: r.count,
      pct: total > 0 ? Math.round(r.count / total * 100) : 0,
    }))
    res.json(result)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/admin/orders
router.get('/orders', adminAuth, (req, res) => {
  try {
    const { status, payment_status, search, limit = 10, page = 1 } = req.query
    let sql = 'SELECT o.*, u.full_name, u.phone as user_phone FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE 1=1'
    const params = []
    if (status && status !== 'All') { sql += ' AND o.status = ?'; params.push(status.toLowerCase()) }
    if (payment_status && payment_status !== 'All') { sql += ' AND o.payment_status = ?'; params.push(payment_status.toLowerCase()) }
    if (search) { sql += ' AND (o.id LIKE ? OR u.full_name LIKE ? OR u.phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }

    const total = db.prepare(sql.replace('SELECT o.*, u.full_name, u.phone as user_phone', 'SELECT COUNT(*) as cnt')).get(params)?.cnt || 0
    sql += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`
    params.push(Number(limit), (Number(page) - 1) * Number(limit))

    const orders = db.prepare(sql).all(params).map(o => ({ ...o, items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id) }))
    res.json({ orders, total, page: Number(page), total_pages: Math.ceil(total / Number(limit)) })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// PUT /api/admin/orders/:id
router.put('/orders/:id', adminAuth, (req, res) => {
  try {
    const { status, payment_status } = req.body
    db.prepare("UPDATE orders SET status = COALESCE(?, status), payment_status = COALESCE(?, payment_status), updated_at = datetime('now') WHERE id = ?")
      .run(status || null, payment_status || null, req.params.id)
    broadcast('order_updated', { id: req.params.id, status, payment_status })
    logActivity(req.user?.id, req.user?.email || 'Admin', 'ORDER', 'order', req.params.id, `Status: ${status || '—'}, To'lov: ${payment_status || '—'}`)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

const PRODUCT_SORT = {
  newest:     'p.created_at DESC',
  name_asc:   'p.name_uz ASC',
  price_asc:  'p.price ASC',
  price_desc: 'p.price DESC',
  sku_asc:    'p.sku ASC NULLS LAST',
}

// GET /api/admin/products
router.get('/products', adminAuth, (req, res) => {
  try {
    const { category_id, search, page = 1, limit = 20, sort } = req.query
    let sql = 'SELECT p.*, c.name_uz as cat_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1'
    const params = []
    if (category_id) { sql += ' AND p.category_id = ?'; params.push(category_id) }
    if (search) { sql += ' AND (p.name_uz LIKE ? OR p.name_ru LIKE ? OR p.sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
    const total = db.prepare(sql.replace('SELECT p.*, c.name_uz as cat_name', 'SELECT COUNT(*) as cnt')).get(params)?.cnt || 0
    sql += ` ORDER BY ${PRODUCT_SORT[sort] || PRODUCT_SORT.newest} LIMIT ? OFFSET ?`
    params.push(Number(limit), (Number(page) - 1) * Number(limit))
    const products = db.prepare(sql).all(params).map(p => ({ ...p, images: JSON.parse(p.images || '[]'), colors: JSON.parse(p.colors || '[]'), sizes: JSON.parse(p.sizes || '[]') }))
    res.json({ products, total, total_pages: Math.ceil(total / Number(limit)) })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// POST /api/admin/products
router.post('/products', adminAuth, (req, res) => {
  try {
    const { name_uz, name_ru, name_en, description_uz, description_ru, price, old_price, category_id, images = [], colors = [], sizes = [], is_trending = false, is_new_arrival = false, sku } = req.body
    if (!name_uz || !price) return res.status(400).json({ detail: 'Nomi va narxi kerak' })
    const id = uuidv4()
    db.prepare('INSERT INTO products (id, name_uz, name_ru, name_en, description_uz, description_ru, price, old_price, category_id, images, colors, sizes, is_trending, is_new_arrival, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, name_uz, name_ru || null, name_en || null, description_uz || null, description_ru || null, price, old_price || null, category_id || null, JSON.stringify(images), JSON.stringify(colors), JSON.stringify(sizes), is_trending ? 1 : 0, is_new_arrival ? 1 : 0, sku || null)
    broadcast('product_changed', { action: 'created', id })
    logActivity(req.user?.id, req.user?.email || 'Admin', 'CREATE', 'product', id, `"${name_uz}" qo'shildi`)
    res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(id))
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// PUT /api/admin/products/:id
router.put('/products/:id', adminAuth, (req, res) => {
  try {
    const { name_uz, name_ru, price, old_price, category_id, images, colors, sizes, is_trending, is_new_arrival, sku } = req.body
    db.prepare('UPDATE products SET name_uz = COALESCE(?, name_uz), name_ru = COALESCE(?, name_ru), price = COALESCE(?, price), old_price = ?, category_id = COALESCE(?, category_id), images = COALESCE(?, images), colors = COALESCE(?, colors), sizes = COALESCE(?, sizes), is_trending = COALESCE(?, is_trending), is_new_arrival = COALESCE(?, is_new_arrival), sku = COALESCE(?, sku) WHERE id = ?')
      .run(name_uz || null, name_ru || null, price || null, old_price !== undefined ? old_price : null, category_id || null, images ? JSON.stringify(images) : null, colors ? JSON.stringify(colors) : null, sizes ? JSON.stringify(sizes) : null, is_trending !== undefined ? (is_trending ? 1 : 0) : null, is_new_arrival !== undefined ? (is_new_arrival ? 1 : 0) : null, sku !== undefined ? (sku || null) : null, req.params.id)
    broadcast('product_changed', { action: 'updated', id: req.params.id })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// DELETE /api/admin/products/:id
router.delete('/products/:id', adminAuth, (req, res) => {
  try {
    const id = req.params.id
    db.prepare('DELETE FROM inventory WHERE product_id = ?').run(id)
    db.prepare('DELETE FROM cart WHERE product_id = ?').run(id)
    db.prepare('DELETE FROM order_items WHERE product_id = ?').run(id)
    db.prepare('DELETE FROM reviews WHERE product_id = ?').run(id)
    db.prepare('DELETE FROM favorites WHERE product_id = ?').run(id)
    db.prepare('DELETE FROM products WHERE id = ?').run(id)
    broadcast('product_changed', { action: 'deleted', id })
    logActivity(req.user?.id, req.user?.email || 'Admin', 'DELETE', 'product', id, "Mahsulot o'chirildi")
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// POST /api/admin/products/bulk-delete
router.post('/products/bulk-delete', adminAuth, (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ detail: 'IDs kerak' })
    const ph = ids.map(() => '?').join(',')
    db.prepare(`DELETE FROM inventory WHERE product_id IN (${ph})`).run(ids)
    db.prepare(`DELETE FROM cart WHERE product_id IN (${ph})`).run(ids)
    db.prepare(`DELETE FROM order_items WHERE product_id IN (${ph})`).run(ids)
    db.prepare(`DELETE FROM reviews WHERE product_id IN (${ph})`).run(ids)
    db.prepare(`DELETE FROM favorites WHERE product_id IN (${ph})`).run(ids)
    db.prepare(`DELETE FROM products WHERE id IN (${ph})`).run(ids)
    broadcast('product_changed', { action: 'bulk_deleted', count: ids.length })
    res.json({ success: true, deleted: ids.length })
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

// GET /api/admin/stats/revenue
router.get('/stats/revenue', adminAuth, (req, res) => {
  try {
    const monthly = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month,
             COUNT(*) as orders,
             COALESCE(SUM(final_amount), 0) as revenue
      FROM orders WHERE status != 'cancelled'
      GROUP BY month ORDER BY month DESC LIMIT 12
    `).all()
    res.json(monthly)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/admin/customers (with stats)
router.get('/customers', adminAuth, (req, res) => {
  try {
    const { search, limit = 20, page = 1 } = req.query
    let sql = `SELECT u.id, u.full_name, u.email, u.phone, u.language, u.loyalty_points, u.created_at,
                 COUNT(o.id) as total_orders,
                 COALESCE(SUM(o.final_amount), 0) as total_spent,
                 MAX(o.created_at) as last_order_date
               FROM users u
               LEFT JOIN orders o ON u.id = o.user_id
               WHERE u.role = 'customer'`
    const params = []
    if (search) {
      sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    sql += ' GROUP BY u.id ORDER BY total_spent DESC LIMIT ? OFFSET ?'
    params.push(Number(limit), (Number(page) - 1) * Number(limit))

    const customers = db.prepare(sql).all(params)
    const countSql = `SELECT COUNT(*) as cnt FROM users WHERE role = 'customer'${search ? ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)' : ''}`
    const countParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []
    const total = db.prepare(countSql).get(countParams)?.cnt || 0
    res.json({ customers, total })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/admin/customers/export (CSV)
router.get('/customers/export', adminAuth, (req, res) => {
  try {
    const { search } = req.query
    let sql = `SELECT u.id, u.full_name, u.email, u.phone, u.loyalty_points, u.created_at,
                 COUNT(o.id) as total_orders,
                 COALESCE(SUM(o.final_amount), 0) as total_spent
               FROM users u
               LEFT JOIN orders o ON u.id = o.user_id
               WHERE u.role = 'customer'`
    const params = []
    if (search) {
      sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    sql += ' GROUP BY u.id ORDER BY total_spent DESC'
    const customers = db.prepare(sql).all(params)

    const header = "Ism,Email,Telefon,Buyurtmalar,Jami xarid,Loyalty,Ro'yxatdan o'tgan\n"
    const rows = customers.map(c =>
      [c.full_name || '', c.email || '', c.phone || '', c.total_orders, c.total_spent, c.loyalty_points, c.created_at?.slice(0,10)].join(',')
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="customers-${new Date().toISOString().slice(0,10)}.csv"`)
    res.send('﻿' + header + rows)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/admin/customers/:id/orders
router.get('/customers/:id/orders', adminAuth, (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(req.params.id)
    res.json(orders)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// DELETE /api/admin/orders/:id
router.delete('/orders/:id', adminAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(req.params.id)
    db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id)
    broadcast('order_updated', { id: req.params.id, deleted: true })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/admin/reports/sales
router.get('/reports/sales', adminAuth, (req, res) => {
  try {
    const { from, to } = req.query
    const fromDate = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const toDate   = to   || new Date().toISOString().slice(0, 10)

    const daily = db.prepare(`
      SELECT strftime('%Y-%m-%d', created_at) as date,
             COUNT(*) as orders_count,
             COALESCE(SUM(final_amount), 0) as revenue,
             COALESCE(AVG(final_amount), 0) as avg_order
      FROM orders
      WHERE date(created_at) BETWEEN ? AND ? AND status != 'cancelled'
      GROUP BY date ORDER BY date
    `).all(fromDate, toDate)

    const summary = db.prepare(`
      SELECT COUNT(*) as total_orders,
             COALESCE(SUM(final_amount), 0) as total_revenue,
             COALESCE(AVG(final_amount), 0) as avg_order
      FROM orders WHERE date(created_at) BETWEEN ? AND ? AND status != 'cancelled'
    `).get(fromDate, toDate)

    res.json({ daily, summary, from: fromDate, to: toDate })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/admin/reports/top-products
router.get('/reports/top-products', adminAuth, (req, res) => {
  try {
    const top = db.prepare(`
      SELECT p.id, p.name_uz, p.images,
             COALESCE(SUM(oi.quantity), 0) as sold_qty,
             COALESCE(SUM(oi.subtotal), 0) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.id ORDER BY sold_qty DESC LIMIT 10
    `).all().map(r => ({ ...r, images: JSON.parse(r.images || '[]') }))
    res.json(top)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/admin/reports/export (CSV)
router.get('/reports/export', adminAuth, (req, res) => {
  try {
    const { from, to } = req.query
    const fromDate = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const toDate   = to   || new Date().toISOString().slice(0, 10)
    const orders = db.prepare(`
      SELECT o.id, o.delivery_name, o.delivery_phone, o.final_amount, o.status, o.payment_method, o.created_at
      FROM orders o WHERE date(o.created_at) BETWEEN ? AND ? ORDER BY o.created_at DESC
    `).all(fromDate, toDate)

    const header = 'Buyurtma ID,Mijoz,Telefon,Summa,Holat,To\'lov,Sana\n'
    const rows = orders.map(o =>
      [o.id, o.delivery_name || '', o.delivery_phone || '', o.final_amount, o.status, o.payment_method, o.created_at?.slice(0,10)].join(',')
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="orders_${fromDate}_${toDate}.csv"`)
    res.send('﻿' + header + rows) // BOM for Excel
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
router.get('/categories', adminAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM categories ORDER BY id').all()
    res.json(rows)
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.post('/categories', adminAuth, (req, res) => {
  try {
    const { name_uz, name_ru, name_en, icon, emoji, image } = req.body
    if (!name_uz) return res.status(400).json({ detail: 'Nomi kerak' })
    const r = db.prepare('INSERT INTO categories (name_uz, name_ru, name_en, icon, emoji, image) VALUES (?, ?, ?, ?, ?, ?)').run(name_uz, name_ru || null, name_en || null, icon || null, emoji || null, image || null)
    res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(r.lastInsertRowid))
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.put('/categories/:id', adminAuth, (req, res) => {
  try {
    const { name_uz, name_ru, name_en, icon, emoji, image } = req.body
    db.prepare('UPDATE categories SET name_uz=COALESCE(?,name_uz), name_ru=COALESCE(?,name_ru), name_en=COALESCE(?,name_en), icon=COALESCE(?,icon), emoji=COALESCE(?,emoji), image=COALESCE(?,image) WHERE id=?').run(name_uz||null, name_ru||null, name_en||null, icon||null, emoji||null, image||null, req.params.id)
    res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id))
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.delete('/categories/:id', adminAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

// ─── DISCOUNTS / PROMO CODES ──────────────────────────────────────────────────
router.get('/discounts', adminAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM discount_codes ORDER BY created_at DESC').all()
    res.json(rows)
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.post('/discounts', adminAuth, (req, res) => {
  try {
    const { code, discount_percent, description, max_uses, expires_at, is_active = 1 } = req.body
    if (!code || !discount_percent) return res.status(400).json({ detail: 'Kod va chegirma foizi kerak' })
    const r = db.prepare('INSERT INTO discount_codes (code, discount_percent, description, max_uses, expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?)').run(code.toUpperCase(), Number(discount_percent), description||null, max_uses ? Number(max_uses) : 0, expires_at||null, is_active ? 1 : 0)
    res.status(201).json(db.prepare('SELECT * FROM discount_codes WHERE id = ?').get(r.lastInsertRowid))
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.put('/discounts/:id', adminAuth, (req, res) => {
  try {
    const { code, discount_percent, description, max_uses, expires_at, is_active } = req.body
    db.prepare('UPDATE discount_codes SET code=COALESCE(?,code), discount_percent=COALESCE(?,discount_percent), description=COALESCE(?,description), max_uses=COALESCE(?,max_uses), expires_at=COALESCE(?,expires_at), is_active=COALESCE(?,is_active) WHERE id=?').run(code||null, discount_percent||null, description||null, max_uses!==undefined?Number(max_uses):null, expires_at!==undefined?expires_at:null, is_active!==undefined?(is_active?1:0):null, req.params.id)
    res.json(db.prepare('SELECT * FROM discount_codes WHERE id = ?').get(req.params.id))
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.delete('/discounts/:id', adminAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM discount_codes WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

// ─── BRANCHES ─────────────────────────────────────────────────────────────────
router.get('/branches', adminAuth, (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM branches ORDER BY id').all())
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.post('/branches', adminAuth, (req, res) => {
  try {
    const { name, address, phone, latitude, longitude, working_hours, is_active = 1 } = req.body
    if (!name) return res.status(400).json({ detail: 'Filial nomi kerak' })
    const r = db.prepare('INSERT INTO branches (name, address, phone, latitude, longitude, working_hours, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, address||null, phone||null, latitude||null, longitude||null, working_hours||null, is_active ? 1 : 0)
    res.status(201).json(db.prepare('SELECT * FROM branches WHERE id = ?').get(r.lastInsertRowid))
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.put('/branches/:id', adminAuth, (req, res) => {
  try {
    const { name, address, phone, latitude, longitude, working_hours, is_active } = req.body
    db.prepare('UPDATE branches SET name=COALESCE(?,name), address=COALESCE(?,address), phone=COALESCE(?,phone), latitude=COALESCE(?,latitude), longitude=COALESCE(?,longitude), working_hours=COALESCE(?,working_hours), is_active=COALESCE(?,is_active) WHERE id=?').run(name||null, address||null, phone||null, latitude||null, longitude||null, working_hours||null, is_active!==undefined?(is_active?1:0):null, req.params.id)
    res.json(db.prepare('SELECT * FROM branches WHERE id = ?').get(req.params.id))
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.delete('/branches/:id', adminAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM branches WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
router.post('/push-notification', adminAuth, (req, res) => {
  try {
    const { title, body, target = 'all' } = req.body
    if (!title || !body) return res.status(400).json({ detail: 'Sarlavha va matn kerak' })
    let users
    if (target === 'all') {
      users = db.prepare("SELECT id FROM users WHERE role = 'customer'").all()
    } else if (target === 'active') {
      users = db.prepare("SELECT DISTINCT user_id as id FROM orders WHERE created_at > datetime('now', '-30 days')").all()
    } else {
      users = db.prepare("SELECT id FROM users WHERE role = 'customer'").all()
    }
    const stmt = db.prepare('INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)')
    users.forEach(u => stmt.run(u.id, title, body))
    // Log activity
    db.prepare('INSERT INTO activity_log (user_name, action, entity_type, details) VALUES (?, ?, ?, ?)').run('Admin', 'PUSH_SENT', 'notification', `"${title}" → ${users.length} foydalanuvchi`)
    res.json({ ok: true, sent_to: users.length })
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────
router.get('/activity', adminAuth, (req, res) => {
  try {
    const { limit = 50, page = 1, action } = req.query
    let sql = 'SELECT * FROM activity_log WHERE 1=1'
    const params = []
    if (action) { sql += ' AND action = ?'; params.push(action) }
    const total = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as cnt')).get(params)?.cnt || 0
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(Number(limit), (Number(page) - 1) * Number(limit))
    const rows = db.prepare(sql).all(params)
    res.json({ rows, total, total_pages: Math.ceil(total / Number(limit)) })
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

// ─── NEWS (admin CRUD) ────────────────────────────────────────────────────────
router.get('/news', adminAuth, (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM news ORDER BY created_at DESC').all())
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.post('/news', adminAuth, (req, res) => {
  try {
    const { title_uz, title_ru, body_uz, body_ru, image, tag = 'news', is_active = 1 } = req.body
    if (!title_uz) return res.status(400).json({ detail: 'Sarlavha kerak' })
    const r = db.prepare('INSERT INTO news (title_uz, title_ru, body_uz, body_ru, image, tag, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)').run(title_uz, title_ru||null, body_uz||null, body_ru||null, image||null, tag, is_active?1:0)
    res.status(201).json(db.prepare('SELECT * FROM news WHERE id = ?').get(r.lastInsertRowid))
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.put('/news/:id', adminAuth, (req, res) => {
  try {
    const { title_uz, title_ru, body_uz, body_ru, image, tag, is_active } = req.body
    db.prepare('UPDATE news SET title_uz=COALESCE(?,title_uz), title_ru=COALESCE(?,title_ru), body_uz=COALESCE(?,body_uz), body_ru=COALESCE(?,body_ru), image=COALESCE(?,image), tag=COALESCE(?,tag), is_active=COALESCE(?,is_active) WHERE id=?').run(title_uz||null,title_ru||null,body_uz||null,body_ru||null,image||null,tag||null,is_active!==undefined?(is_active?1:0):null,req.params.id)
    res.json(db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id))
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.delete('/news/:id', adminAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

// ─── BANNERS ──────────────────────────────────────────────────────────────────
router.get('/banners', adminAuth, (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM banners ORDER BY sort_order, id').all())
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.post('/banners', adminAuth, (req, res) => {
  try {
    const { image, title, subtitle, link, sort_order = 0, is_active = 1 } = req.body
    if (!image) return res.status(400).json({ detail: 'Rasm kerak' })
    const r = db.prepare('INSERT INTO banners (image, title, subtitle, link, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)').run(image, title||null, subtitle||null, link||null, Number(sort_order), is_active?1:0)
    res.status(201).json(db.prepare('SELECT * FROM banners WHERE id = ?').get(r.lastInsertRowid))
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.put('/banners/:id', adminAuth, (req, res) => {
  try {
    const { image, title, subtitle, link, sort_order, is_active } = req.body
    db.prepare('UPDATE banners SET image=COALESCE(?,image), title=COALESCE(?,title), subtitle=COALESCE(?,subtitle), link=COALESCE(?,link), sort_order=COALESCE(?,sort_order), is_active=COALESCE(?,is_active) WHERE id=?').run(image||null,title||null,subtitle||null,link||null,sort_order!==undefined?Number(sort_order):null,is_active!==undefined?(is_active?1:0):null,req.params.id)
    res.json(db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id))
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.delete('/banners/:id', adminAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

// ─── POS (Kassa) ──────────────────────────────────────────────────────────────
router.post('/pos/order', adminAuth, (req, res) => {
  try {
    const { items, total_amount, delivery_amount = 0, promo_code, payment_method = 'cash', customer_name, customer_phone } = req.body
    if (!items || !items.length) return res.status(400).json({ detail: 'Mahsulotlar kerak' })

    let discountAmount = 0
    if (promo_code) {
      const promo = db.prepare('SELECT * FROM discount_codes WHERE code = ? AND is_active = 1').get(promo_code)
      if (promo) discountAmount = Math.round((total_amount * promo.discount_percent) / 100)
    }

    const finalAmount = (total_amount || 0) - discountAmount + Number(delivery_amount)
    const oid = 'POS-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase()

    db.prepare(`INSERT INTO orders (id, total_amount, final_amount, delivery_amount, discount_amount, status, payment_method, delivery_address, delivery_name, delivery_phone, promo_code, payment_status)
      VALUES (?, ?, ?, ?, ?, 'delivered', ?, 'Kassa savdosi', ?, ?, ?, 'paid')`).run(oid, total_amount, finalAmount, delivery_amount, discountAmount, payment_method, customer_name || 'Kassa mijozi', customer_phone || null, promo_code || null)

    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, size, color, price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    items.forEach(item => {
      const prod = db.prepare('SELECT name_uz FROM products WHERE id = ?').get(item.product_id)
      insertItem.run(oid, item.product_id, prod?.name_uz || '', item.quantity, item.size || '', item.color || '', item.price, item.price * item.quantity)
    })

    if (promo_code) {
      db.prepare('UPDATE discount_codes SET used_count = used_count + 1 WHERE code = ?').run(promo_code)
    }

    logActivity(req.user?.id, req.user?.email || 'Admin', 'CREATE', 'pos_order', oid, `Kassa savdosi: ${finalAmount} so'm`)
    broadcast('order_created', { id: oid, status: 'delivered', final_amount: finalAmount, payment_method })

    res.status(201).json({ id: oid, final_amount: finalAmount, success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

module.exports = router
