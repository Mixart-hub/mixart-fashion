const db = require('./db')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    phone TEXT,
    full_name TEXT NOT NULL,
    password_hash TEXT,
    role TEXT DEFAULT 'customer',
    profile_image TEXT,
    loyalty_points INTEGER DEFAULT 0,
    referral_code TEXT UNIQUE,
    language TEXT DEFAULT 'uz',
    telegram_id TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_uz TEXT,
    name_ru TEXT,
    name_en TEXT,
    icon TEXT,
    emoji TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name_uz TEXT,
    name_ru TEXT,
    name_en TEXT,
    description_uz TEXT,
    description_ru TEXT,
    price REAL NOT NULL,
    old_price REAL,
    category_id INTEGER REFERENCES categories(id),
    images TEXT DEFAULT '[]',
    colors TEXT DEFAULT '[]',
    sizes TEXT DEFAULT '[]',
    is_trending INTEGER DEFAULT 0,
    is_new_arrival INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    address TEXT,
    phone TEXT,
    latitude REAL,
    longitude REAL
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT REFERENCES products(id),
    branch_id INTEGER REFERENCES branches(id),
    size TEXT,
    color TEXT,
    quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    UNIQUE(product_id, branch_id, size, color)
  );

  CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    product_id TEXT REFERENCES products(id),
    quantity INTEGER DEFAULT 1,
    size TEXT,
    color TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    total_amount REAL,
    final_amount REAL,
    delivery_amount REAL DEFAULT 20000,
    discount_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'new',
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'unpaid',
    delivery_address TEXT,
    delivery_name TEXT,
    delivery_phone TEXT,
    promo_code TEXT,
    note TEXT,
    courier_name TEXT,
    estimated_delivery TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT REFERENCES orders(id),
    product_id TEXT REFERENCES products(id),
    product_name TEXT,
    quantity INTEGER,
    size TEXT,
    color TEXT,
    price REAL,
    subtotal REAL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT REFERENCES products(id),
    user_id TEXT REFERENCES users(id),
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT DEFAULT 'seller',
    branch_id INTEGER REFERENCES branches(id),
    basic_salary REAL DEFAULT 0,
    allowances REAL DEFAULT 0,
    deductions REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    password_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS discount_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    discount_percent INTEGER,
    is_active INTEGER DEFAULT 1,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    product_id TEXT REFERENCES products(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    title TEXT,
    body TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    user_name TEXT,
    action TEXT,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_uz TEXT,
    title_ru TEXT,
    body_uz TEXT,
    body_ru TEXT,
    image TEXT,
    tag TEXT DEFAULT 'news',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image TEXT,
    title TEXT,
    subtitle TEXT,
    link TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

// Add columns if not exist (safe for repeated runs)
const alterSafe = (sql) => { try { db.exec(sql) } catch {} }
alterSafe('ALTER TABLE categories ADD COLUMN image TEXT')
alterSafe('ALTER TABLE branches ADD COLUMN is_active INTEGER DEFAULT 1')
alterSafe('ALTER TABLE branches ADD COLUMN working_hours TEXT')
alterSafe('ALTER TABLE discount_codes ADD COLUMN max_uses INTEGER DEFAULT 0')
alterSafe('ALTER TABLE discount_codes ADD COLUMN used_count INTEGER DEFAULT 0')
alterSafe('ALTER TABLE discount_codes ADD COLUMN description TEXT')
alterSafe('ALTER TABLE staff ADD COLUMN permissions TEXT DEFAULT \'[]\'')
alterSafe('ALTER TABLE staff ADD COLUMN telegram_id TEXT')
alterSafe('ALTER TABLE staff ADD COLUMN last_active TEXT')
alterSafe('ALTER TABLE orders ADD COLUMN branch_id INTEGER REFERENCES branches(id)')
alterSafe('ALTER TABLE orders ADD COLUMN assigned_staff_id INTEGER REFERENCES staff(id)')
alterSafe('ALTER TABLE products ADD COLUMN sku TEXT')

// Seed default settings
const seedSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
const defaults = [
  ['store_name', 'Mixart Fashion'],
  ['store_address', "Toshkent, Chilonzor tumani, Bunyodkor ko'chasi 45"],
  ['store_phone', '+998 90 123 45 67'],
  ['store_email', 'info@mixart.uz'],
  ['working_hours', '09:00 - 21:00'],
  ['currency', 'UZS'],
  ['timezone', 'Asia/Tashkent'],
  ['click_enabled', 'true'],
  ['click_merchant_id', ''],
  ['click_secret_key', ''],
  ['payme_enabled', 'true'],
  ['payme_merchant_id', ''],
  ['payme_secret_key', ''],
  ['email_notifications', 'true'],
  ['email_address', 'info@mixart.uz'],
  ['sms_notifications', 'false'],
  ['sms_phone', ''],
  ['telegram_notifications', 'true'],
  ['telegram_token', ''],
  ['telegram_chat_id', ''],
  ['product_field_config', JSON.stringify({
    sku: 'required',
    name_ru: 'optional',
    old_price: 'optional',
    category_id: 'required',
    sizes: 'required',
    colors: 'optional',
    images: 'required',
    is_trending: 'optional',
  })],
]
defaults.forEach(([k, v]) => seedSetting.run(k, v))

console.log('✅ Database migrated successfully')
console.log('📍 DB path:', require('path').resolve(__dirname, '../../', process.env.DB_PATH || 'mixart_node.db'))
