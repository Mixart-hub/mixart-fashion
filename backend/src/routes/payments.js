const router = require('express').Router()
const db = require('../database/db')

// POST /api/payments/click/prepare
router.post('/click/prepare', (req, res) => {
  try {
    const { click_trans_id, service_id, merchant_trans_id, amount } = req.body
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(merchant_trans_id)
    if (!order) return res.json({ error: -5, error_note: 'Buyurtma topilmadi' })
    if (order.payment_status === 'paid') return res.json({ error: -4, error_note: 'Allaqachon to\'langan' })
    res.json({ click_trans_id, merchant_trans_id, merchant_prepare_id: order.id, error: 0, error_note: 'Success' })
  } catch (e) {
    res.status(500).json({ error: -9, error_note: e.message })
  }
})

// POST /api/payments/click/complete
router.post('/click/complete', (req, res) => {
  try {
    const { merchant_trans_id, error } = req.body
    if (Number(error) >= 0) {
      db.prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?").run(merchant_trans_id)
    }
    res.json({ error: 0, error_note: 'Success' })
  } catch (e) {
    res.status(500).json({ error: -9, error_note: e.message })
  }
})

// POST /api/payments/payme
router.post('/payme', (req, res) => {
  try {
    const { method, params } = req.body
    if (method === 'CheckPerformTransaction') {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(params?.account?.order_id)
      if (!order) return res.json({ error: { code: -31050, message: 'Buyurtma topilmadi' }, id: req.body.id })
      res.json({ result: { allow: true }, id: req.body.id })
    } else if (method === 'PerformTransaction') {
      db.prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?").run(params?.account?.order_id)
      res.json({ result: { transaction: params?.id, perform_time: Date.now(), state: 2 }, id: req.body.id })
    } else {
      res.json({ result: {}, id: req.body.id })
    }
  } catch (e) {
    res.status(500).json({ error: { code: -32400, message: e.message }, id: req.body.id })
  }
})

// GET /api/payments/check/:order_id
router.get('/check/:order_id', (req, res) => {
  try {
    const order = db.prepare('SELECT id, payment_status, status FROM orders WHERE id = ?').get(req.params.order_id)
    if (!order) return res.status(404).json({ detail: 'Buyurtma topilmadi' })
    res.json(order)
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

module.exports = router
