const multer = require('multer')
const path = require('path')
const fs = require('fs')

function createUploader(subdir) {
  const uploadDir = path.join(__dirname, '../../media', subdir)
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg'
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
    },
  })

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Faqat rasm fayllari qabul qilinadi'))
      }
      cb(null, true)
    },
  })
}

module.exports = { createUploader }
