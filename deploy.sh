#!/bin/bash
# ── Mixart Fashion — Deploy skripti (Node.js stack) ──────────────────────────
# Ubuntu 22.04 LTS server uchun
# Talablar: Node.js 18+, npm, PM2, nginx
#
# Birinchi marta:
#   1. cp backend/.env.node.production backend/.env.node
#   2. nano backend/.env.node          # real secret, domain, telegram token
#   3. bash deploy.sh
#
# Keyingi deploy'lar:
#   bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

PROJECT_DIR=$(cd "$(dirname "$0")" && pwd)
LOG_DIR="/var/log/mixart"

echo ""
echo "======================================="
echo "  Mixart Fashion — Node.js Deploy"
echo "  Papka: $PROJECT_DIR"
echo "======================================="

# 1. .env.node tekshirish
echo ""
echo "[1/6] .env.node tekshirilmoqda..."
if [ ! -f "$PROJECT_DIR/backend/.env.node" ]; then
  echo "  XATO: backend/.env.node fayl yo'q!"
  echo "  Qadamlar:"
  echo "    cp backend/.env.node.production backend/.env.node"
  echo "    nano backend/.env.node    # CHANGE_THIS qiymatlarni to'ldiring"
  exit 1
fi
if grep -q "CHANGE_THIS" "$PROJECT_DIR/backend/.env.node"; then
  echo "  XATO: backend/.env.node ichida CHANGE_THIS qiymatlari qolgan!"
  echo "  nano backend/.env.node    # to'ldiring"
  exit 1
fi
echo "  [OK] .env.node tayyor"

# 2. Node.js va PM2 tekshirish
echo ""
echo "[2/6] Muhit tekshirilmoqda..."
node --version || { echo "Node.js o'rnatilmagan! (nvm yoki nodejs paket)"; exit 1; }
npm --version  || { echo "npm o'rnatilmagan!"; exit 1; }
pm2 --version  || { echo "PM2 o'rnatilmoqda..."; npm install -g pm2; }
echo "  [OK]"

# 3. npm install
echo ""
echo "[3/6] npm install..."
cd "$PROJECT_DIR/backend"  && npm install --production --silent
cd "$PROJECT_DIR/frontend" && npm install --silent
cd "$PROJECT_DIR/admin"    && npm install --silent
echo "  [OK]"

# 4. DB migratsiya
echo ""
echo "[4/6] Database migratsiya..."
cd "$PROJECT_DIR/backend"
node src/database/migrate.js
echo "  [OK]"

# 5. Build
echo ""
echo "[5/6] Frontend va Admin build..."
cd "$PROJECT_DIR/frontend" && npm run build
cd "$PROJECT_DIR/admin"    && npm run build
echo "  [OK] dist/ papkalar yaratildi"

# 6. PM2 ishga tushirish / restart
echo ""
echo "[6/6] PM2 restart..."
mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR"
pm2 startOrRestart ecosystem.config.js --env production
pm2 save

# Nginx
echo ""
echo "Nginx reload..."
nginx -t 2>/dev/null && systemctl reload nginx || echo "  (Nginx tekshiring: sudo nginx -t)"

echo ""
echo "======================================="
echo "  Deploy tugadi!"
echo "======================================="
echo ""
echo "  PM2 holati:  pm2 status"
echo "  API logs:    pm2 logs mixart-api"
echo "  Nginx logs:  tail -f /var/log/nginx/error.log"
echo ""
echo "  Health tekshirish:"
echo "    curl http://localhost:5000/health"
echo ""
