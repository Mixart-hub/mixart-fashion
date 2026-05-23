const router = require('express').Router()
const db = require('../database/db')

router.get('/', (req, res) => {
  try {
    const { limit = 20, tag } = req.query
    let sql = 'SELECT * FROM news WHERE is_active = 1'
    const params = []
    if (tag) { sql += ' AND tag = ?'; params.push(tag) }
    sql += ' ORDER BY created_at DESC LIMIT ?'
    params.push(Number(limit))
    res.json(db.prepare(sql).all(params))
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.get('/banners', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order, id').all())
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM news WHERE id = ? AND is_active = 1').get(req.params.id)
    if (!item) return res.status(404).json({ detail: 'Topilmadi' })
    res.json(item)
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

module.exports = router
