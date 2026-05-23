# Mixart Fashion — To'liq Setup Qo'llanmasi

## 1. LOCAL ISHLAB CHIQISH (Windows, SQLite)

```bash
# 1. O'rnatish
install.bat

# 2. .env ni sozlash
copy .env.windows backend\.env
# backend\.env da TELEGRAM_BOT_TOKEN ni kiriting

# 3. DB va seed
cd backend
python seed.py

# 4. Ishga tushirish
cd ..
python run.py
```

**Manzillar:**
- API: http://localhost:8000
- Admin: http://localhost:8000/admin
- Docs: http://localhost:8000/docs
- TWA: http://localhost:8000/twa

---

## 2. PRODUCTION (PostgreSQL, Linux/Docker)

### PostgreSQL sozlash
```bash
sudo -u postgres psql -f setup_postgres.sql
# setup_postgres.sql da STRONG_PASSWORD_HERE ni o'zgartiring
```

### .env sozlash
```bash
cp .env.production backend/.env
# barcha bo'sh qiymatlarni to'ldiring
```

### Migratsiya (Alembic)
```bash
cd backend
alembic upgrade head
python seed.py
```

### Click va Payme Webhook sozlash

**Click** (my.click.uz → Xizmatlar):
- Prepare URL: `https://yourdomain.com/api/v1/payments/click/prepare`
- Complete URL: `https://yourdomain.com/api/v1/payments/click/complete`

**Payme** (merchant.payme.uz):
- Checkout URL: `https://yourdomain.com/api/v1/payments/payme`
- Method: POST, JSON-RPC 2.0

### Docker bilan
```bash
docker compose up -d
# Birinchi marta:
docker compose exec backend alembic upgrade head
docker compose exec backend python seed.py
```

---

## 3. TELEGRAM BOT BUYRUQLARI

```
/start    - Botni ishga tushirish
/lang     - Tilni o'zgartirish
/myorders - Buyurtmalarni ko'rish
/track    - Oxirgi buyurtma holati
/track 123 - #123 buyurtma holati
/cancel   - Oxirgi buyurtmani bekor qilish
/profile  - Profil va loyallik balli
/contact  - Aloqa ma'lumotlari
/help     - Yordam
```

---

## 4. TEST PROMO KODLAR

| Kod | Chegirma |
|-----|----------|
| MIXART10 | 10% |
| MIXART15 | 15% |
| WELCOME20 | 20% |
| VIP30 | 30% |
| SALE50 | 50% |

---

## 5. DEFAULT LOGIN

- **Admin:** +998900000000 / admin123
- **Operator:** +998901111111 / operator123

---

## 6. SMS va EMAIL TEST

SMS va Email faqat `.env` da konfiguratsiya qilingan bo'lsa ishlaydi:
- SMS: `ESKIZ_EMAIL` va `ESKIZ_PASSWORD` → notify.eskiz.uz
- Email: `SMTP_USER` va `SMTP_PASS` → Gmail App Password

Buyurtma statusi o'zgarganda avtomatik yuboriladi.
