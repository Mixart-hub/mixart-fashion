# Mixart Fashion — Production Deploy Qo'llanmasi

## Talablar
- Ubuntu 22.04 VPS (RAM 1GB+)
- Node.js 18 LTS
- PM2: `npm install -g pm2`
- Nginx

---

## 1. Server sozlash (birinchi marta)

```bash
# Node.js 18 o'rnatish
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 o'rnatish
sudo npm install -g pm2

# Nginx
sudo apt-get install -y nginx

# Log papkasi
sudo mkdir -p /var/log/mixart
sudo chown $USER:$USER /var/log/mixart
```

---

## 2. Kodni serverga ko'chirish

```bash
# Server'da loyiha joylashuvi
sudo mkdir -p /var/www/mixart
sudo chown $USER:$USER /var/www/mixart

# Git bilan (yoki scp/rsync bilan)
cd /var/www/mixart
git clone <your-repo-url> .
# YOKI: scp -r ./mixart user@server:/var/www/mixart
```

---

## 3. Environment sozlash

```bash
cd /var/www/mixart

# Backend .env.node yaratish
cp backend/.env.node.production backend/.env.node
nano backend/.env.node
```

**To'ldirish kerak bo'lgan qatorlar:**
```env
JWT_SECRET=<64+ belgili random string>
# Generatsiya: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

TELEGRAM_BOT_TOKEN=<@BotFather dan>
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook

FRONTEND_URL=https://yourdomain.com
ADMIN_URL=https://admin.yourdomain.com
TWA_URL=https://yourdomain.com
```

**Frontend va Admin uchun:**
```bash
# frontend/.env.production va admin/.env.production
# yourdomain.com ni haqiqiy domenga almashtiring
sed -i 's/yourdomain.com/example.com/g' frontend/.env.production
sed -i 's/yourdomain.com/example.com/g' admin/.env.production
```

---

## 4. Deploy

```bash
cd /var/www/mixart
bash deploy.sh
```

Skript quyidagilarni bajaradi:
1. `.env.node` tekshiradi (CHANGE_THIS qolmagan bo'lishi kerak)
2. `npm install` barcha 3 papkada
3. `node src/database/migrate.js` — DB strukturasini yaratadi
4. `frontend` va `admin` build qiladi
5. PM2 orqali backendni ishga tushiradi

---

## 5. Nginx sozlash

```bash
# Konfiguratsiyani ko'chirish
sudo cp nginx/mixart.conf /etc/nginx/sites-available/mixart.conf

# yourdomain.com ni haqiqiy domenga almashtiring
sudo nano /etc/nginx/sites-available/mixart.conf

# Faollashtirish
sudo ln -sf /etc/nginx/sites-available/mixart.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test va reload
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. SSL (HTTPS) — Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx

# Sertifikat olish
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d admin.yourdomain.com

# Avtomatik yangilash (systemd timer orqali ishlaydi)
sudo certbot renew --dry-run
```

---

## 7. Telegram webhook ro'yxatdan o'tkazish

Server ishga tushgandan keyin (Node_ENV=production):
```bash
# Backend avtomatik webhook o'rnatadi (server.js)
# Tekshirish:
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

---

## Foydali buyruqlar

```bash
# PM2
pm2 status                    # servislar holati
pm2 logs mixart-api           # real-time loglar
pm2 restart mixart-api        # restart
pm2 monit                     # monitoring UI

# Nginx
sudo nginx -t                 # konfiguratsiya test
sudo systemctl reload nginx   # hot reload
tail -f /var/log/nginx/error.log

# Database
cd /var/www/mixart/backend
node src/database/migrate.js  # migratsiya
node src/database/seed.js     # test ma'lumotlar (faqat birinchi marta)

# Health tekshirish
curl https://yourdomain.com/api/health
```

---

## DB backup

```bash
# Kunlik backup (crontab -e ga qo'shish)
0 3 * * * cp /var/www/mixart/backend/mixart_node.db /backup/mixart_$(date +\%Y\%m\%d).db
```
