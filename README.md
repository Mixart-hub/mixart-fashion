# 🛍️ Mixart Fashion — To'liq Loyiha

Ayollar kiyim-kechak va aksessuarlar do'koni uchun professional boshqaruv tizimi.

## 📦 Texnologiyalar

| Qism         | Texnologiya                          |
|--------------|--------------------------------------|
| Backend      | Python 3.11 + FastAPI                |
| Database     | PostgreSQL 16 + SQLAlchemy + Alembic |
| Cache        | Redis 7                              |
| Bot          | Python + aiogram 3.x                 |
| TWA Frontend | React 18 + Vite + Tailwind CSS       |
| Admin Panel  | HTML/CSS/JS (admin.html)             |
| Deploy       | Docker Compose + Nginx               |

## 🗂️ Loyiha strukturasi

```
mixart/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   │   ├── auth.py          # Kirish, ro'yxat, Telegram auth
│   │   │   ├── products.py      # Mahsulotlar CRUD, sklad, izohlar
│   │   │   ├── orders.py        # Buyurtmalar, statistika
│   │   │   ├── cart.py          # Savat boshqaruvi
│   │   │   ├── reports.py       # Excel/PDF hisobotlar
│   │   │   ├── payments.py      # Click + Payme webhook
│   │   │   ├── branches.py      # Filiallar + xodimlar
│   │   │   └── marketing.py     # Flash sale, promo, bildirishnomalar
│   │   ├── core/
│   │   │   ├── config.py        # Sozlamalar
│   │   │   └── security.py      # JWT, parol hash
│   │   ├── db/database.py       # PostgreSQL ulanish
│   │   ├── models/models.py     # 12 ta jadval
│   │   ├── schemas/schemas.py   # Pydantic sxemalar
│   │   └── main.py              # FastAPI app, 11 router
│   ├── alembic/                 # Migratsiyalar
│   ├── seed.py                  # Boshlang'ich ma'lumotlar
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── bot/
│   ├── handlers/
│   │   ├── customer.py          # Mijoz handlerlari (start, profil)
│   │   ├── operator.py          # Operator (buyurtma, holat)
│   │   └── admin.py             # Admin (statistika, broadcast)
│   ├── keyboards/keyboards.py   # Barcha tugmalar
│   ├── config.py
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/BottomNav.jsx
│   │   │   ├── common/ProductCard.jsx
│   │   │   └── pages/
│   │   │       ├── HomePage.jsx     # Bosh sahifa, flash sale
│   │   │       ├── CatalogPage.jsx  # Katalog, qidiruv, filter
│   │   │       ├── ProductPage.jsx  # Mahsulot, o'lcham, rang
│   │   │       ├── CartPage.jsx     # Savat, to'lov
│   │   │       ├── OrdersPage.jsx   # Buyurtmalar tarixi
│   │   │       └── ProfilePage.jsx  # Profil, loyallik
│   │   ├── services/api.js          # Axios API client
│   │   ├── store/store.js           # Zustand state
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── admin.html               # To'liq admin panel (HTML)
│   ├── package.json
│   └── vite.config.js
├── nginx/nginx.conf
├── docker-compose.yml
└── README.md
```

## 🚀 Ishga tushirish (5 qadam)

### 1. Reponi clone qilish
```bash
git clone <repo-url>
cd mixart
```

### 2. .env faylni sozlash
```bash
cp backend/.env.example backend/.env
# .env faylni tahrirlang:
# - TELEGRAM_BOT_TOKEN
# - CLICK va PAYME kalitlari
# - SECRET_KEY (tasodifiy 32+ belgi)
```

### 3. Docker bilan ishga tushirish
```bash
docker-compose up -d
```

### 4. Database migratsiya va seed
```bash
# Jadvallar avtomatik yaratiladi (startup da)
# Boshlang'ich ma'lumotlar:
docker-compose exec backend python seed.py
```

### 5. Frontend build
```bash
cd frontend
npm install
npm run build
# dist/ papkasi nginx ga ko'chiriladi
```

## 🔗 URLlar

| Xizmat       | URL                           |
|--------------|-------------------------------|
| API          | http://localhost:8000         |
| API Docs     | http://localhost:8000/docs    |
| Admin Panel  | http://localhost/admin        |
| TWA          | http://localhost/             |

## 📡 API Endpointlar

### Auth (`/api/v1/auth`)
- `POST /login` — Telefon/parol bilan kirish
- `POST /register` — Ro'yxatdan o'tish
- `POST /telegram` — Telegram orqali kirish
- `GET /me` — Joriy foydalanuvchi

### Mahsulotlar (`/api/v1/products`)
- `GET /` — Ro'yxat (filter, qidiruv, pagination)
- `GET /trending` — Ommabop mahsulotlar
- `GET /flash-sale` — Aktiv flash sale
- `GET /categories` — Kategoriyalar
- `GET /{id}` — Batafsil
- `POST /` — Yaratish (Admin)
- `PUT /{id}` — Tahrirlash (Admin)
- `DELETE /{id}` — O'chirish (Admin)
- `GET /{id}/stock` — Sklad holati
- `PUT /{id}/stock` — Sklad yangilash
- `POST /{id}/review` — Izoh qo'shish
- `POST /{id}/favorite` — Sevimlilarga qo'shish

### Buyurtmalar (`/api/v1/orders`)
- `POST /` — Yangi buyurtma (promo, loyallik avtomatik)
- `GET /` — Ro'yxat (filter: status, branch, customer, sana)
- `GET /stats` — Kunlik/oylik statistika
- `GET /{id}` — Batafsil
- `PATCH /{id}/status` — Holat o'zgartirish
- `PATCH /{id}/payment` — To'lovni tasdiqlash

### To'lovlar (`/api/v1/payments`)
- `POST /click/prepare` — Click prepare webhook
- `POST /click/complete` — Click complete webhook
- `POST /payme` — Payme webhook

### Marketing (`/api/v1`)
- `POST /flash-sales/` — Flash sale yaratish
- `GET /flash-sales/active` — Aktiv sale
- `GET /promo/check/{code}` — Promo kodni tekshirish
- `POST /promo/` — Yangi promo kod
- `POST /notifications/send` — Bildirishnoma yuborish

## 🗃️ Database Jadvallar

| Jadval              | Maqsad                              |
|---------------------|-------------------------------------|
| users               | Admin, operator, sotuvchi, mijozlar |
| branches            | Filiallar (1-30 ta)                 |
| categories          | Ko'ylak, bluza, shim, sumka...      |
| products            | Mahsulotlar                         |
| stocks              | Sklad (o'lcham/rang bo'yicha)       |
| orders              | Buyurtmalar                         |
| order_items         | Buyurtma tarkibi                    |
| carts               | Savatlar                            |
| cart_items          | Savat elementlari                   |
| loyalty_accounts    | Bronze/Silver/Gold                  |
| promo_codes         | Promo kodlar                        |
| reviews             | Mahsulot izohlari                   |
| favorites           | Sevimli mahsulotlar                 |
| flash_sales         | Flash aksiyalar                     |
| notifications       | Bildirishnomalar                    |

## 🤖 Telegram Bot Buyruqlari

| Buyruq        | Kim uchun | Maqsad                     |
|---------------|-----------|----------------------------|
| /start        | Hammasi   | Botni boshlash, TWA ochish |
| /lang         | Hammasi   | Til tanlash                |
| /orders       | Operator  | Yangi buyurtmalar ko'rish  |
| /stats        | Operator  | Bugungi statistika         |
| /admin        | Admin     | Admin panel                |
| /broadcast    | Admin     | Ommaviy xabar yuborish     |

## 📱 SMS va Email Notifications

### SMS (Eskiz.uz — O'zbekiston uchun)
1. [notify.eskiz.uz](https://notify.eskiz.uz) da ro'yxatdan o'ting
2. `.env` ga qo'shing:
```
ESKIZ_EMAIL=your@email.com
ESKIZ_PASSWORD=your-password
ESKIZ_FROM=4546
```

### Email (Gmail / SMTP)
1. Gmail App Password yarating: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. `.env` ga qo'shing:
```
SMTP_USER=your@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
SMTP_FROM_NAME=Mixart Fashion
```

## 💳 To'lov Integratsiyasi

### Payme
1. [payme.uz](https://payme.uz) da merchant yarating
2. `.env` ga:
```
PAYME_MERCHANT_ID=your-id
PAYME_SECRET_KEY=your-key
PAYME_TEST_MODE=False
```
3. Callback URL: `https://yourdomain.com/api/v1/payments/payme`

### Click
1. [click.uz](https://click.uz) dan merchant oling
2. `.env` ga:
```
CLICK_MERCHANT_ID=xxxxx
CLICK_SERVICE_ID=xxxxx
CLICK_SECRET_KEY=your-key
```
3. Callback URL: `https://yourdomain.com/api/v1/payments/click/complete`

## 🚀 Production Deploy (Ubuntu 22.04)

```bash
# Serverga yuklash
git clone <repo-url> && cd mixart

# Domen bilan deploy
bash deploy.sh yourdomain.com
```

Yoki qadamma-qadam:
```bash
# 1. .env sozlash
cp backend/.env.example backend/.env
nano backend/.env   # TELEGRAM_BOT_TOKEN, SECRET_KEY, PAYME, CLICK

# 2. Frontend build
cd frontend && npm install && npm run build && cd ..

# 3. Docker ishga tushirish
docker compose up -d --build

# 4. Seed (birinchi marta)
docker compose exec backend python seed.py

# 5. SSL sertifikat (Certbot)
docker compose run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    --email admin@yourdomain.com \
    --agree-tos --no-eff-email \
    -d yourdomain.com
docker compose restart nginx
```

## 💡 Muhim eslatmalar

1. **Telegram Bot Token** — @BotFather dan oling
2. **TWA_URL** — `https://yourdomain.com/twa` bo'lishi kerak (HTTPS majburiy)
3. **Click integratsiya** — click.uz saytidan merchant ID oling; callback: `/api/v1/payments/click/complete`
4. **Payme integratsiya** — payme.uz dan merchant ID; callback: `/api/v1/payments/payme`
5. **SMS** — Eskiz.uz orqali (O'zbekiston uchun eng yaxshi)
6. **SSL sertifikat** — production da HTTPS majburiy (Telegram TWA uchun)
7. **SECRET_KEY** — `python -c "import secrets; print(secrets.token_hex(32))"` bilan yarating
8. **Gemini AI** — [aistudio.google.com](https://aistudio.google.com) dan API key oling

## 📞 Qo'llab-quvvatlash

Savollar uchun: @mixart_support
