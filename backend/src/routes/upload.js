const router = require('express').Router()
const { createUploader } = require('../middleware/upload')

const productUpload = createUploader('products')

// POST /api/upload/products
router.post('/products', productUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'Fayl yuklanmadi' })
  const url = `/media/products/${req.file.filename}`
  res.json({ url, filename: req.file.filename })
})

module.exports = router
