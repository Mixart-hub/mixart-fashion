# Mixart Fashion — Ishga tushirish

## 1. .env fayl
```bash
cp .env.example .env
# .env faylni to'ldiring
```

## 2. Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

## 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## 4. Docker (production)
```bash
docker-compose up -d
```

---
## URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- Health: http://localhost:3001/health

## Admin login
- Email: admin@mixart.fashion
- Parol: admin123
