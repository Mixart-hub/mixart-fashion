const router = require('express').Router()
const db = require('../database/db')
const adminAuth = require('../middleware/adminAuth')
const branchAuth = require('../middleware/branchAuth')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { logActivity } = require('../middleware/activityLogger')

// ── Admin-only: CRUD ───────────────────────────────────────────────────────

router.get('/', adminAuth, (req, res) => {
  try {
    const { role, branch, search, limit = 20, page = 1 } = req.query
    let sql = 'SELECT s.*, b.name as branch_name FROM staff s LEFT JOIN branches b ON s.branch_id = b.id WHERE 1=1'
    const params = []
    if (role && role !== 'All') { sql += ' AND s.role = ?'; params.push(role.toLowerCase()) }
    if (branch && branch !== 'All') { sql += ' AND b.name = ?'; params.push(branch) }
    if (search) { sql += ' AND (s.name LIKE ? OR s.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
    const total = db.prepare(sql.replace('SELECT s.*, b.name as branch_name', 'SELECT COUNT(*) as cnt')).get(params)?.cnt || 0
    sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?'
    params.push(Number(limit), (Number(page) - 1) * Number(limit))
    const staff = db.prepare(sql).all(params).map(({ password_hash, ...s }) => s)
    res.json({ staff, total, total_pages: Math.ceil(total / Number(limit)) })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

router.post('/', adminAuth, (req, res) => {
  try {
    const { name, email, phone, role = 'seller', branch_id, basic_salary = 0, allowances = 0, deductions = 0, password = 'mixart123' } = req.body
    if (!name || !email) return res.status(400).json({ detail: 'Ism va email kerak' })
    const hash = bcrypt.hashSync(password, 10)
    const stmt = db.prepare('INSERT INTO staff (name, email, phone, role, branch_id, basic_salary, allowances, deductions, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    stmt.run(name, email, phone || null, role, branch_id || null, basic_salary, allowances, deductions, hash)
    logActivity(req.user?.id, req.user?.name || req.user?.email || 'Admin', 'CREATE', 'staff', null, `Yangi xodim qo'shildi: ${name} (${role})`)
    res.status(201).json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

router.put('/:id', adminAuth, (req, res) => {
  try {
    const { name, email, phone, role, branch_id, basic_salary, allowances, deductions, is_active, password } = req.body
    if (password) {
      const hash = bcrypt.hashSync(password, 10)
      db.prepare('UPDATE staff SET password_hash = ? WHERE id = ?').run(hash, req.params.id)
    }
    db.prepare(`UPDATE staff SET
      name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone),
      role = COALESCE(?, role), branch_id = COALESCE(?, branch_id),
      basic_salary = COALESCE(?, basic_salary), allowances = COALESCE(?, allowances),
      deductions = COALESCE(?, deductions), is_active = COALESCE(?, is_active) WHERE id = ?`
    ).run(name || null, email || null, phone || null, role || null, branch_id || null,
      basic_salary ?? null, allowances ?? null, deductions ?? null,
      is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

router.delete('/:id', adminAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM staff WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

router.get('/:id/performance', adminAuth, (req, res) => {
  try {
    const s = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id)
    if (!s) return res.status(404).json({ detail: 'Xodim topilmadi' })
    const orders = db.prepare('SELECT COUNT(*) as cnt, SUM(final_amount) as total FROM orders WHERE assigned_staff_id = ?').get(req.params.id)
    res.json({
      orders_processed: orders?.cnt || 0,
      sales_total: orders?.total || 0,
      rating: 4.5,
      tasks_done: 0,
    })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// ── Staff auth ─────────────────────────────────────────────────────────────

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ detail: 'Email va parol kerak' })

    const s = db.prepare('SELECT * FROM staff WHERE email = ? AND is_active = 1').get(email)
    if (!s || !s.password_hash) return res.status(401).json({ detail: "Email yoki parol noto'g'ri" })

    if (!bcrypt.compareSync(password, s.password_hash)) {
      return res.status(401).json({ detail: "Email yoki parol noto'g'ri" })
    }

    db.prepare("UPDATE staff SET last_login = datetime('now'), last_active = datetime('now') WHERE id = ?").run(s.id)
    logActivity(s.id, s.name, 'LOGIN', 'staff', s.id, 'Xodim tizimga kirdi')

    const token = jwt.sign(
      { id: s.id, role: s.role, branch_id: s.branch_id, name: s.name, email: s.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    const { password_hash, ...safe } = s
    res.json({ access_token: token, staff: safe })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

router.get('/me', branchAuth, (req, res) => {
  try {
    const s = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.user.id)
    if (!s) return res.status(404).json({ detail: 'Xodim topilmadi' })
    const { password_hash, ...safe } = s
    res.json(safe)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// ── Staff-facing: Orders ───────────────────────────────────────────────────

router.get('/orders', branchAuth, (req, res) => {
  try {
    const { limit = 30, skip = 0, status } = req.query
    const params = []
    let where = '1=1'

    if (req.branchId) {
      where += ' AND (branch_id = ? OR branch_id IS NULL)'
      params.push(req.branchId)
    }
    if (status) {
      where += ' AND status = ?'
      params.push(status)
    }

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM orders WHERE ${where}`).get(params)?.cnt || 0
    const rows = db.prepare(`SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all([...params, Number(limit), Number(skip)])
    const orders = rows.map(o => ({
      ...o,
      items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id),
    }))

    res.json({ orders, total })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

router.patch('/orders/:id/status', branchAuth, (req, res) => {
  try {
    const { new_status } = req.body
    const valid = ['new', 'processing', 'shipped', 'delivered', 'cancelled']
    if (!valid.includes(new_status)) return res.status(400).json({ detail: "Noto'g'ri status" })

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
    if (!order) return res.status(404).json({ detail: 'Buyurtma topilmadi' })

    if (req.branchId && order.branch_id && order.branch_id !== req.branchId) {
      return res.status(403).json({ detail: "Bu buyurtma sizning filialingizga tegishli emas" })
    }

    const update = { status: new_status }
    if (new_status === 'processing' && !order.assigned_staff_id) {
      update.assigned_staff_id = req.user.id
      if (!order.branch_id && req.branchId) update.branch_id = req.branchId
    }

    db.prepare(`UPDATE orders SET status = ?, assigned_staff_id = COALESCE(?, assigned_staff_id),
      branch_id = COALESCE(?, branch_id), updated_at = datetime('now') WHERE id = ?`)
      .run(new_status, update.assigned_staff_id || null, update.branch_id || null, req.params.id)

    logActivity(req.user.id, req.user.name, 'UPDATE', 'order', req.params.id, `Status: ${order.status} → ${new_status}`)

    const { broadcastToBranch } = require('../events')
    const targetBranch = update.branch_id || order.branch_id
    broadcastToBranch(targetBranch, 'order_updated', { id: req.params.id, status: new_status, branch_id: targetBranch })

    res.json({ success: true, status: new_status })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

router.patch('/orders/:id/assign', branchAuth, (req, res) => {
  try {
    const branchId = req.branchId || req.body.branch_id
    if (!branchId) return res.status(400).json({ detail: 'branch_id kerak' })

    db.prepare("UPDATE orders SET branch_id = ?, assigned_staff_id = ?, updated_at = datetime('now') WHERE id = ?")
      .run(branchId, req.user.id, req.params.id)

    logActivity(req.user.id, req.user.name, 'ASSIGN', 'order', req.params.id, `Filialga biriktildi: branch ${branchId}`)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// ── Staff-facing: Inventory ────────────────────────────────────────────────

router.get('/inventory', branchAuth, (req, res) => {
  try {
    const branchId = req.branchId || req.query.branch_id
    let sql = `SELECT i.*, p.name_uz, p.name_ru, p.price, p.images, b.name as branch_name
               FROM inventory i
               JOIN products p ON i.product_id = p.id
               JOIN branches b ON i.branch_id = b.id WHERE 1=1`
    const params = []
    if (branchId) { sql += ' AND i.branch_id = ?'; params.push(branchId) }
    sql += ' ORDER BY p.name_uz'
    const rows = db.prepare(sql).all(params).map(r => ({
      ...r,
      images: JSON.parse(r.images || '[]'),
    }))
    res.json(rows)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// ── Staff-facing: Dashboard stats ─────────────────────────────────────────

router.get('/dashboard', branchAuth, (req, res) => {
  try {
    const branchId = req.branchId

    const orderWhere = branchId
      ? 'WHERE branch_id = ? OR branch_id IS NULL'
      : 'WHERE 1=1'
    const orderParams = branchId ? [branchId] : []

    const todayOrders = db.prepare(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(final_amount),0) as total FROM orders ${orderWhere} AND date(created_at) = date('now')`
    ).get(orderParams)

    const pendingOrders = db.prepare(
      `SELECT COUNT(*) as cnt FROM orders ${orderWhere} AND status IN ('new','processing')`
    ).get(orderParams)

    const invWhere = branchId ? 'WHERE i.branch_id = ? AND i.quantity <= i.min_stock' : 'WHERE i.quantity <= i.min_stock'
    const invParams = branchId ? [branchId] : []
    const lowStock = db.prepare(
      `SELECT COUNT(*) as cnt FROM inventory i ${invWhere}`
    ).get(invParams)

    res.json({
      today_orders: todayOrders?.cnt || 0,
      today_revenue: todayOrders?.total || 0,
      pending_orders: pendingOrders?.cnt || 0,
      low_stock_items: lowStock?.cnt || 0,
    })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

module.exports = router
