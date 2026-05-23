const router = require('express').Router()
const db = require('../database/db')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const uploadDir = path.join(__dirname, '../../media/products')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

function parseProduct(p) {
  if (!p) return null
  return {
    ...p,
    images: JSON.parse(p.images || '[]'),
    colors: JSON.parse(p.colors || '[]'),
    sizes: JSON.parse(p.sizes || '[]'),
    is_trending: !!p.is_trending,
    is_new_arrival: !!p.is_new_arrival,
  }
}

// GET /api/products
router.get('/', (req, res) => {
  try {
    const { category_id, search, is_trending, is_new_arrival, favorites_of, limit = 20, skip = 0, sort = 'created_at' } = req.query

    // Favorites filter — different JOIN needed
    if (favorites_of) {
      let sql = `SELECT p.*, c.name_uz as category_name FROM products p
                 LEFT JOIN categories c ON p.category_id = c.id
                 INNER JOIN favorites f ON f.product_id = p.id
                 WHERE f.user_id = ?`
      const params = [favorites_of]
      if (category_id) { sql += ' AND p.category_id = ?'; params.push(category_id) }
      if (search) { sql += ' AND (p.name_uz LIKE ? OR p.name_ru LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
      const total = db.prepare(sql.replace('SELECT p.*, c.name_uz as category_name', 'SELECT COUNT(*) as cnt')).get(params)?.cnt || 0
      sql += ' ORDER BY f.created_at DESC LIMIT ? OFFSET ?'
      params.push(Number(limit), Number(skip))
      const items = db.prepare(sql).all(params).map(parseProduct)
      return res.json({ items, total, page: 1 })
    }

    let sql = 'SELECT p.*, c.name_uz as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1'
    const params = []

    if (category_id) { sql += ' AND p.category_id = ?'; params.push(category_id) }
    if (search) { sql += ' AND (p.name_uz LIKE ? OR p.name_ru LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
    if (is_trending === 'true') { sql += ' AND p.is_trending = 1' }
    if (is_new_arrival === 'true') { sql += ' AND p.is_new_arrival = 1' }

    const total = db.prepare(sql.replace('SELECT p.*, c.name_uz as category_name', 'SELECT COUNT(*) as cnt')).get(params)?.cnt || 0
    sql += ` ORDER BY p.${['created_at','price','rating','reviews_count'].includes(sort) ? sort : 'created_at'} DESC LIMIT ? OFFSET ?`
    params.push(Number(limit), Number(skip))

    const items = db.prepare(sql).all(params).map(parseProduct)
    res.json({ items, total, page: Math.floor(Number(skip) / Number(limit)) + 1 })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/products/trending
router.get('/trending', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products WHERE is_trending = 1 ORDER BY created_at DESC LIMIT 10').all().map(parseProduct)
    res.json(products)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/products/categories
router.get('/categories', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM categories ORDER BY id').all())
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// GET /api/products/:id
router.get('/:id', (req, res) => {
  try {
    const product = parseProduct(db.prepare('SELECT p.*, c.name_uz as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(req.params.id))
    if (!product) return res.status(404).json({ detail: 'Mahsulot topilmadi' })

    const stocks = db.prepare('SELECT i.*, b.name as branch_name FROM inventory i LEFT JOIN branches b ON i.branch_id = b.id WHERE i.product_id = ?').all(req.params.id)
    const reviews = db.prepare('SELECT r.*, u.full_name FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC LIMIT 10').all(req.params.id)
    const avgRating = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE product_id = ?').get(req.params.id)

    res.json({ product, stocks, reviews, avg_rating: avgRating?.avg || 0, review_count: avgRating?.cnt || 0 })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// POST /api/products/:id/favorite
router.post('/:id/favorite', (req, res) => {
  try {
    const { user_id } = req.query
    if (!user_id) return res.status(400).json({ detail: 'user_id kerak' })

    const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?').get(user_id, req.params.id)
    if (existing) {
      db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(user_id, req.params.id)
      res.json({ favorited: false })
    } else {
      db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(user_id, req.params.id)
      res.json({ favorited: true })
    }
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

// POST /api/products/:id/review
router.post('/:id/review', (req, res) => {
  try {
    const { user_id, rating, comment } = req.query
    if (!user_id || !rating) return res.status(400).json({ detail: 'user_id va rating kerak' })
    if (rating < 1 || rating > 5) return res.status(400).json({ detail: 'Rating 1-5 orasida bo\'lishi kerak' })

    db.prepare('INSERT OR REPLACE INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)').run(req.params.id, user_id, Number(rating), comment || null)

    const avg = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE product_id = ?').get(req.params.id)
    db.prepare('UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?').run(avg.avg || 0, avg.cnt || 0, req.params.id)

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

router.post('/upload-image', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No file uploaded' })
  const url = `/media/products/${req.file.filename}`
  res.json({ url, filename: req.file.filename })
})

module.exports = router
