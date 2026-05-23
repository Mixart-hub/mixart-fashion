const db = require('./db')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcryptjs')

// Branches
const branches = [
  { name: 'Tashkent', address: 'Chilonzor tumani, Bunyodkor ko\'chasi 45', phone: '+998901234567', latitude: 41.299496, longitude: 69.240073 },
  { name: 'Samarkand', address: 'Yunusobod tumani, Amir Temur shox ko\'chasi 12', phone: '+998901234568', latitude: 39.649693, longitude: 66.979543 },
  { name: 'Bukhara', address: 'Mirzo Ulug\'bek tumani, Parkent ko\'chasi 78', phone: '+998901234569', latitude: 39.767703, longitude: 64.421692 },
]

const insertBranch = db.prepare(`INSERT OR IGNORE INTO branches (name, address, phone, latitude, longitude) VALUES (?, ?, ?, ?, ?)`)
branches.forEach(b => insertBranch.run(b.name, b.address, b.phone, b.latitude, b.longitude))
console.log('✅ Branches seeded')

// Categories
const cats = [
  { name_uz: 'Kiyimlar',     name_ru: 'Одежда',       name_en: 'Clothing',     icon: 'shirt',        emoji: '👗' },
  { name_uz: 'Kepkalar',     name_ru: 'Кепки',         name_en: 'Caps',         icon: 'hat-baseball', emoji: '🧢' },
  { name_uz: 'Shlyapalar',   name_ru: 'Шляпы',         name_en: 'Hats',         icon: 'hat-cowboy',   emoji: '👒' },
  { name_uz: 'Aksessuarlar', name_ru: 'Аксессуары',    name_en: 'Accessories',  icon: 'bag',          emoji: '👜' },
]
const insertCat = db.prepare(`INSERT OR IGNORE INTO categories (name_uz, name_ru, name_en, icon, emoji) VALUES (?, ?, ?, ?, ?)`)
cats.forEach(c => insertCat.run(c.name_uz, c.name_ru, c.name_en, c.icon, c.emoji))
console.log('✅ Categories seeded')

// Discount codes
const codes = [
  { code: 'WELCOME10', discount_percent: 10 },
  { code: 'MIXART2025', discount_percent: 15 },
  { code: 'SUMMER20', discount_percent: 20 },
]
const insertCode = db.prepare(`INSERT OR IGNORE INTO discount_codes (code, discount_percent) VALUES (?, ?)`)
codes.forEach(c => insertCode.run(c.code, c.discount_percent))
console.log('✅ Discount codes seeded')

// Products
const products = [
  { id: uuidv4(), name_uz: 'Linen Oversize Ko\'ylak', name_ru: 'Льняная рубашка оверсайз', desc_uz: 'Yoz mavsumi uchun qulay va nafis ko\'ylak. 100% jun matosidan', desc_ru: 'Удобная и стильная рубашка для летнего сезона', price: 299000, old_price: null, cat: 1, trending: 1, new: 1, colors: ['beige','white','olive'], sizes: ['XS','S','M','L','XL'] },
  { id: uuidv4(), name_uz: 'Rose Gold Blazer', name_ru: 'Блейзер розовое золото', desc_uz: 'Zamonaviy blazer - ishga ham, dam olishga ham mos', desc_ru: 'Современный блейзер - подходит как для работы, так и для отдыха', price: 650000, old_price: 780000, cat: 1, trending: 1, new: 0, colors: ['rose','beige','black'], sizes: ['XS','S','M','L','XL'] },
  { id: uuidv4(), name_uz: 'Bej Klassik Trenç', name_ru: 'Бежевый классический тренч', desc_uz: 'Har qanday mevsimda chiroyli ko\'rinadigan klassik trench palto', desc_ru: 'Классическое пальто-тренч, которое красиво смотрится в любой сезон', price: 850000, old_price: null, cat: 1, trending: 0, new: 1, colors: ['beige','black'], sizes: ['S','M','L','XL','XXL'] },
  { id: uuidv4(), name_uz: 'Kepka Mixart Classic', name_ru: 'Кепка Mixart Classic', desc_uz: 'Premium sifatli Mixart brendining klassik kepkasi', desc_ru: 'Классическая кепка бренда Mixart премиум качества', price: 159000, old_price: null, cat: 2, trending: 0, new: 1, colors: ['black','beige','blue'], sizes: ['ONE'] },
  { id: uuidv4(), name_uz: 'Panama Mixart', name_ru: 'Панама Mixart', desc_uz: 'Yoz uchun ideal - yengil va chiroyli panama', desc_ru: 'Идеально для лета - легкая и красивая панама', price: 139000, old_price: null, cat: 3, trending: 0, new: 0, colors: ['white','beige'], sizes: ['ONE'] },
  { id: uuidv4(), name_uz: 'Elegant Chain Bag', name_ru: 'Элегантная сумка с цепочкой', desc_uz: 'Oltin zanjirli premium sumka - kechki tadbir uchun ideal', desc_ru: 'Премиум сумка с золотой цепочкой - идеально для вечернего выхода', price: 320000, old_price: null, cat: 4, trending: 1, new: 1, colors: ['black','beige','brown'], sizes: ['ONE'] },
  { id: uuidv4(), name_uz: 'Zamonaviy Qo\'l Sumkasi', name_ru: 'Современная ручная сумка', desc_uz: 'Kundalik foydalanish uchun qulay va chiroyli sumka', desc_ru: 'Удобная и красивая сумка для повседневного использования', price: 200000, old_price: 250000, cat: 4, trending: 0, new: 0, colors: ['black','brown','beige'], sizes: ['ONE'] },
  { id: uuidv4(), name_uz: 'Evening Satin Dress', name_ru: 'Вечернее атласное платье', desc_uz: 'Maxsus tadbirlar uchun mo\'ljallangan atlas ko\'ylak', desc_ru: 'Атласное платье для особых случаев', price: 580000, old_price: null, cat: 1, trending: 1, new: 1, colors: ['beige','pink','blue'], sizes: ['XS','S','M','L'] },
  { id: uuidv4(), name_uz: 'Cozy Knit Set', name_ru: 'Уютный вязаный комплект', desc_uz: 'Qish uchun qulay trikotaj to\'plam', desc_ru: 'Уютный трикотажный комплект для зимы', price: 420000, old_price: null, cat: 1, trending: 0, new: 1, colors: ['beige','white','olive'], sizes: ['S','M','L','XL'] },
  { id: uuidv4(), name_uz: 'Classic Trench Coat', name_ru: 'Классическое пальто тренч', desc_uz: 'Vaqt sinovidan o\'tgan klassik trench palto dizayni', desc_ru: 'Проверенный временем дизайн классического пальто-тренч', price: 450000, old_price: 550000, cat: 1, trending: 0, new: 0, colors: ['beige','black'], sizes: ['S','M','L','XL','XXL'] },
  { id: uuidv4(), name_uz: 'Mixart Urban Sumka', name_ru: 'Сумка Mixart Urban', desc_uz: 'Shahar hayoti uchun funksional va chiroyli sumka', desc_ru: 'Функциональная и красивая сумка для городской жизни', price: 249000, old_price: null, cat: 4, trending: 1, new: 0, colors: ['black','brown'], sizes: ['ONE'] },
  { id: uuidv4(), name_uz: 'Xudi Mixart Premium Shirt', name_ru: 'Рубашка Mixart Premium', desc_uz: 'Premium sifatli Mixart brendining ikonik ko\'ylagi', desc_ru: 'Знаковая рубашка бренда Mixart премиум качества', price: 299000, old_price: null, cat: 1, trending: 1, new: 1, colors: ['white','beige','rose'], sizes: ['XS','S','M','L','XL','XXL'] },
]

const insertProd = db.prepare(`
  INSERT OR IGNORE INTO products (id, name_uz, name_ru, description_uz, description_ru, price, old_price, category_id, images, colors, sizes, is_trending, is_new_arrival)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)
`)

const insertInv = db.prepare(`INSERT OR IGNORE INTO inventory (product_id, branch_id, size, color, quantity) VALUES (?, ?, ?, ?, ?)`)

products.forEach(p => {
  insertProd.run(p.id, p.name_uz, p.name_ru, p.desc_uz, p.desc_ru, p.price, p.old_price, p.cat, JSON.stringify(p.colors), JSON.stringify(p.sizes), p.trending, p.new)
  // Add inventory for each product in each branch
  p.sizes.forEach(size => {
    p.colors.forEach(color => {
      [1, 2, 3].forEach(branchId => {
        const qty = Math.floor(Math.random() * 25 + 3)
        insertInv.run(p.id, branchId, size, color, qty)
      })
    })
  })
})
console.log(`✅ ${products.length} products seeded with inventory`)

// Admin user
const adminPwd = bcrypt.hashSync('admin123', 10)
const adminId = uuidv4()
db.prepare(`INSERT OR IGNORE INTO users (id, email, full_name, password_hash, role, language) VALUES (?, ?, ?, ?, ?, ?)`)
  .run(adminId, 'admin@mixart.uz', 'Mixart Admin', adminPwd, 'admin', 'uz')
console.log('✅ Admin user: admin@mixart.uz / admin123')

// Staff (xodimlar)
const staffPwd = bcrypt.hashSync('mixart123', 10)
const staffMembers = [
  { name: 'Akbar Toshmatov', email: 'manager.tashkent@mixart.uz', phone: '+998901112233', role: 'branch_manager', branch_id: 1 },
  { name: 'Zilola Yusupova',  email: 'seller1@mixart.uz',          phone: '+998901112234', role: 'seller',         branch_id: 1 },
  { name: 'Bobur Rahimov',    email: 'manager.samarkand@mixart.uz', phone: '+998901112235', role: 'branch_manager', branch_id: 2 },
  { name: 'Nodira Karimova',  email: 'operator@mixart.uz',          phone: '+998901112236', role: 'operator',       branch_id: null },
]
const insertStaff = db.prepare(`INSERT OR IGNORE INTO staff (name, email, phone, role, branch_id, password_hash) VALUES (?, ?, ?, ?, ?, ?)`)
staffMembers.forEach(s => insertStaff.run(s.name, s.email, s.phone, s.role, s.branch_id, staffPwd))
console.log('✅ Staff seeded (parol: mixart123)')

// Default settings
const defaults = [
  ['store_name', 'Mixart Fashion'],
  ['currency', 'UZS'],
  ['timezone', 'Asia/Tashkent'],
  ['delivery_fee', '20000'],
]
const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`)
defaults.forEach(([k, v]) => insertSetting.run(k, v))

console.log('✅ Seed complete! Run: npm run dev')
