# CLAUDE.md — Mixart Fashion Loyiha Konteksti

> Bu fayl Claude Code har safar ochilganda avtomatik o'qiydi.
> Loyiha haqida barcha kontekst shu yerda.

---

## 📋 LOYIHA HAQIDA

**Nomi:** Mixart Fashion — moda e-commerce platformasi
**Joylashuv:** `C:\pr\mixart_windows\mixart`
**Til:** Asosan Uzbek (UZ), qo'shimcha RU/EN

### Texnologiyalar
- **Frontend (TWA):** React + Vite + Tailwind — port 3000 (Telegram Web App, mobil)
- **Admin panel:** React + Vite — port 3001 (desktop)
- **Backend:** Node.js + Express — port 5000
- **Database:** SQLite (node-sqlite3-wasm) — fayl: `backend/mixart.db`
- **Bot:** Telegram (telegraf)

### Ranglar (Design System)
- Primary (rose gold): `#C9956C`
- Primary dark: `#B87333`
- Primary light (cream): `#F5EDE8` / `#FDF0E8`
- Dark bg: `#1C1C1E`
- Success: `#10B981`, Warning: `#F59E0B`, Error: `#EF4444`

---

## 🚀 ISHGA TUSHIRISH

```bash
# Hammasi bir vaqtda (root papkadan)
cd C:\pr\mixart_windows\mixart
npm run dev

# Alohida:
cd frontend && npm run dev    # :3000
cd admin && npm run dev        # :3001
cd backend && npm run dev      # :5000

# Database reset
cd backend && node src/database/migrate.js
```

**Admin login:** admin@mixart.uz / admin123

---

## 📁 PAPKA TUZILISHI

```
mixart/
├── frontend/          # TWA mobil (React+Vite)
│   └── src/
│       ├── components/ (BottomNavBar, Header, ProductCard, ...)
│       ├── pages/ (Home, Catalog, ProductDetail, Cart, Checkout, Orders, Profile)
│       ├── store/ (cartStore, authStore)
│       ├── i18n/ (til tarjimalari)
│       └── utils/ (api.js, formatters.js)
├── admin/             # Admin panel (React+Vite)
│   └── src/
│       ├── components/layout/ (AdminSidebar, AdminHeader, AdminLayout)
│       ├── components/modals/ (AddProductModal, ...)
│       └── pages/ (Dashboard, Orders, Products, Inventory, Staff, Settings, ...)
├── backend/           # Node API
│   ├── src/
│   │   ├── database/ (db.js, migrate.js, seed.js, schema.sql)
│   │   ├── routes/ (auth, products, cart, orders, admin, inventory, staff, settings, upload)
│   │   ├── middleware/ (auth, adminAuth, upload, logger)
│   │   └── telegram/ (bot.js)
│   ├── uploads/ (yuklangan rasmlar)
│   └── mixart.db (SQLite database)
└── PROGRESS.md        # ⬅️ ISH HOLATI (har safar shuni o'qi va yangila)
```

---

## ⚙️ MUHIM TEXNIK ESLATMALAR

1. **SQLite (node-sqlite3-wasm):**
   - Sync emas — `initDb()` async chaqirilishi kerak server start'da
   - SQL string'larda SINGLE QUOTES ishlatish ('cancelled', "cancelled" emas)
   - WAL pragma ISHLAMAYDI (WASM VFS qo'llab-quvvatlamaydi)
   - Lock file crash'da tozalanishi kerak (SIGINT/SIGTERM handlers)

2. **Telegram bot:**
   - `.catch()` qo'shilgan bo'lsin bot.launch() da (401 crash bo'lmasligi uchun)

3. **PowerShell:**
   - Eski versiya — ternary `? :` ISHLAMAYDI
   - if-else yoki node ishlatish kerak

4. **Rasm upload:**
   - multer ishlatiladi
   - `/uploads` static serve qilinadi
   - POST `/api/upload/:type` (type: products, categories, banners)

---

## 🎨 KOD STANDARTLARI

- Barcha UI matnlar **Uzbek tilida**
- Narx format: `299 000 so'm` (Intl.NumberFormat 'uz-UZ')
- Sana format: `12-may, 2025`
- Barcha amallar **toast** ko'rsatadi (react-hot-toast)
- O'chirishda **confirm dialog**
- Har API call'da **loading state** + **error handling**
- Order ID format: `MXF-XXXXXX`

---

## 📌 ISHLASH TARTIBI (HAR SAFAR)

1. **Avval `PROGRESS.md` ni o'qi** — qayerda to'xtaganimni bil
2. Vazifani bajar
3. **`PROGRESS.md` ni yangila** — nima qildim, nima qoldi
4. Test qil (`npm run dev`)
5. Foydalanuvchiga qisqa hisobot ber

---

## ✅ HAR SESSIYA OXIRIDA

PROGRESS.md ga yoz:
- ✅ Bugun bajarilgan ishlar
- 🔄 Davom etayotgan ish (qaysi fayl, qaysi funksiya)
- ⏭️ Keyingi qadam
- ⚠️ Ma'lum muammolar
