const router = require('express').Router()
const db = require('../database/db')

const sessions = {}

router.post('/chat', (req, res) => {
  const { message, user_id, role } = req.body
  if (!message) return res.status(400).json({ detail: 'message required' })

  const sid = `${user_id || 'anon'}_${role || 'customer'}`
  if (!sessions[sid]) sessions[sid] = []
  sessions[sid].push({ role: 'user', text: message })

  try {
    const text = generateResponse(message)
    sessions[sid].push({ role: 'ai', text })
    res.json({ text })
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

router.post('/clear-session', (req, res) => {
  const { user_id, role } = req.body
  const sid = `${user_id || 'anon'}_${role || 'customer'}`
  delete sessions[sid]
  res.json({ ok: true })
})

function generateResponse(msg) {
  const lower = msg.toLowerCase()

  // Color search
  const colors = ['qizil', 'ko\'k', 'yashil', 'sariq', 'oq', 'qora', 'jigarrang', 'pushti', 'kulrang']
  for (const color of colors) {
    if (lower.includes(color)) {
      const products = db.prepare("SELECT name_uz, price FROM products WHERE LOWER(name_uz) LIKE ? OR LOWER(CAST(colors AS TEXT)) LIKE ? LIMIT 4").all(`%${color}%`, `%${color}%`)
      if (products.length > 0) {
        const list = products.map(p => `• ${p.name_uz} — ${Math.round(p.price).toLocaleString('ru-RU')} so'm`).join('\n')
        return `${color.charAt(0).toUpperCase() + color.slice(1)} rang kiyimlar:\n\n${list}\n\nBatafsil ko'rish uchun Katalogga o'ting 👗`
      }
    }
  }

  // Size search (match whole word only)
  const sizes = ['xs', 's', 'm', 'l', 'xl', 'xxl']
  const sizeRe = new RegExp(`\\b(${sizes.join('|')})\\b`)
  const sizeMatch = lower.match(sizeRe)
  const matchedSize = sizeMatch ? sizeMatch[1] : null
  for (const size of matchedSize ? [matchedSize] : []) {
    if (true) {
      const products = db.prepare("SELECT name_uz, price FROM products WHERE LOWER(CAST(sizes AS TEXT)) LIKE ? LIMIT 4").all(`%${size}%`)
      if (products.length > 0) {
        const list = products.map(p => `• ${p.name_uz} — ${Math.round(p.price).toLocaleString('ru-RU')} so'm`).join('\n')
        return `${size.toUpperCase()} o'lchamdagi kiyimlar:\n\n${list}\n\nKatalogdan ko'proq tanlang 🛍`
      }
    }
  }

  // Trend / popular
  if (lower.includes('trend') || lower.includes('mashhur') || lower.includes('popular')) {
    const products = db.prepare('SELECT name_uz, price FROM products WHERE is_trending = 1 LIMIT 5').all()
    if (products.length > 0) {
      const list = products.map(p => `• ${p.name_uz} — ${Math.round(p.price).toLocaleString('ru-RU')} so'm`).join('\n')
      return `Hozirgi trenddagi kiyimlar:\n\n${list}\n\n🔥 Bu mahsulotlar eng ko'p sotib olinmoqda!`
    }
  }

  // Cheap / affordable
  if (lower.includes('arzon') || lower.includes('narx') || lower.includes('chegirma') || lower.includes('ucheap')) {
    const products = db.prepare('SELECT name_uz, price FROM products ORDER BY price ASC LIMIT 5').all()
    if (products.length > 0) {
      const list = products.map(p => `• ${p.name_uz} — ${Math.round(p.price).toLocaleString('ru-RU')} so'm`).join('\n')
      return `Narxi qulay kiyimlar:\n\n${list}\n\nBo'lishi mumkin chegirmalar uchun promo kodlarni tekshiring 🏷`
    }
  }

  // Dress / ko'ylak
  if (lower.includes('ko\'ylak') || lower.includes('dress') || lower.includes('kiyim') || lower.includes('libosdress')) {
    const products = db.prepare("SELECT name_uz, price FROM products WHERE LOWER(name_uz) LIKE '%ko\\'ylak%' OR LOWER(name_uz) LIKE '%dress%' LIMIT 5").all()
    if (products.length > 0) {
      const list = products.map(p => `• ${p.name_uz} — ${Math.round(p.price).toLocaleString('ru-RU')} so'm`).join('\n')
      return `Ko'ylaklar kolleksiyasi:\n\n${list}\n\nBarcha ko'ylaklar uchun katalogga kiring 👗`
    }
  }

  // General product search
  const products = db.prepare("SELECT name_uz, price FROM products WHERE LOWER(name_uz) LIKE ? OR LOWER(name_ru) LIKE ? LIMIT 4").all(`%${lower.slice(0, 20)}%`, `%${lower.slice(0, 20)}%`)
  if (products.length > 0) {
    const list = products.map(p => `• ${p.name_uz} — ${Math.round(p.price).toLocaleString('ru-RU')} so'm`).join('\n')
    return `Sizning so'rovingiz bo'yicha topildi:\n\n${list}`
  }

  // Greetings
  if (lower.includes('salom') || lower.includes('assaloma') || lower.includes('hello') || lower.includes('привет')) {
    return 'Salom! Men Mix — Mixart Fashion stilistimanman 👗✨\n\nSizga quyidagilarda yordam bera olaman:\n• Kiyim tanlash\n• O\'lcham bo\'yicha qidirish\n• Narx bo\'yicha filter\n• Trenddagi kiyimlar\n\nQanday kiyim qidiryapsiz?'
  }

  // Help
  if (lower.includes('yordam') || lower.includes('help') || lower.includes('nimalar')) {
    return 'Men sizga yordam bera olaman:\n\n🔍 Kiyim qidirish — "Qizil ko\'ylak bormi?"\n📏 O\'lcham — "M o\'lcham liboslar"\n💰 Narx — "Arzon kiyimlar"\n🔥 Trend — "Trenddagi kiyimlar"\n👗 Tur — "Bayram uchun ko\'ylak"\n\nQaysi bo\'limdan boshlaysiz?'
  }

  // Default
  const allProducts = db.prepare('SELECT name_uz, price FROM products ORDER BY RANDOM() LIMIT 3').all()
  if (allProducts.length > 0) {
    const list = allProducts.map(p => `• ${p.name_uz} — ${Math.round(p.price).toLocaleString('ru-RU')} so'm`).join('\n')
    return `Siz uchun tavsiyalar:\n\n${list}\n\nBatafsil ma'lumot uchun katalogimizga o'ting yoki konkret savol bering! 😊`
  }

  return 'Kechirasiz, hozircha bu savolga javob bera olmayman. Kiyim turi, rang yoki o\'lcham bo\'yicha so\'rang! 👗'
}

module.exports = router
