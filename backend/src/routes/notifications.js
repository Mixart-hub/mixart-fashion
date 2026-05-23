const router = require('express').Router()
const db = require('../database/db')
const auth = require('../middleware/auth')

router.get('/user/:user_id', auth, (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(req.params.user_id)
    res.json(rows)
  } catch {
    res.json([])
  }
})

router.post('/send', (req, res) => {
  const { title, body, user_id } = req.query
  if (!title || !body) return res.status(400).json({ detail: 'title and body required' })
  try {
    if (user_id) {
      db.prepare('INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)').run(user_id, title, body)
    } else {
      const users = db.prepare('SELECT id FROM users WHERE role = ?').all('customer')
      const stmt = db.prepare('INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)')
      users.forEach(u => stmt.run(u.id, title, body))
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

router.put('/:id/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

router.get('/unread/:user_id', (req, res) => {
  try {
    const count = db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0').get(req.params.user_id)?.cnt || 0
    const items = db.prepare('SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT 10').all(req.params.user_id)
    res.json({ count, items })
  } catch { res.json({ count: 0, items: [] }) }
})

module.exports = router
