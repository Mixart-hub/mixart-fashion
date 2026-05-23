"""
Barcha muammolarni tekshirish skripti.
Ishlatish: python check_issues.py
"""
import sys, os, json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

for env_f in [os.path.join(BASE_DIR,".env.windows"), os.path.join(BACKEND_DIR,".env")]:
    if os.path.exists(env_f):
        with open(env_f, encoding="utf-8") as f:
            for line in f:
                line=line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k,_,v=line.partition("=")
                    os.environ.setdefault(k.strip(),v.strip().strip('"').strip("'"))
        break

from app.db.database import SessionLocal, Base, engine
from app.models.models import User, Product, Category, Order, Branch, PromoCode, Stock, Notification
from sqlalchemy import func

Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("="*50)
print("MIXART MUAMMOLAR TEKSHIRUVI")
print("="*50)

# 1. Mahsulotlar
prods = db.query(Product).all()
print(f"\n1. Mahsulotlar: {len(prods)} ta")
for p in prods[:3]:
    stocks = db.query(Stock).filter(Stock.product_id==p.id).all()
    imgs = p.images if p.images else []
    print(f"   - {p.name_uz} | narx: ${p.price} | rasmlar: {len(imgs)} | sklad: {len(stocks)}")

# 2. Kategoriyalar
cats = db.query(Category).all()
print(f"\n2. Kategoriyalar: {len(cats)} ta")
for c in cats:
    print(f"   - {c.emoji} {c.name_uz}")

# 3. Filiallar
branches = db.query(Branch).all()
print(f"\n3. Filiallar: {len(branches)} ta")
for b in branches:
    print(f"   - {b.name} | {b.address}")

# 4. Foydalanuvchilar rollar bo'yicha
print(f"\n4. Foydalanuvchilar:")
for role in ["admin","operator","seller","customer"]:
    cnt = db.query(func.count(User.id)).filter(User.role==role).scalar()
    print(f"   - {role}: {cnt} ta")

# 5. Telegram ID bor foydalanuvchilar
tg_users = db.query(User).filter(User.telegram_id != None).count()
print(f"\n5. Telegram orqali ro'yxatdan o'tganlar: {tg_users} ta")

# 6. PromoCode
promos = db.query(PromoCode).all()
print(f"\n6. Promo kodlar: {len(promos)} ta")

# 7. Bildirishnomalar
notifs = db.query(Notification).filter(Notification.is_sent==False).count()
print(f"\n7. Yuborilmagan bildirishnomalar: {notifs} ta")

# 8. Mahsulotlarda filial bormi?
print(f"\n8. Product modelida branch_id maydoni: ", end="")
try:
    col = Product.__table__.columns.get('branch_id')
    print("BOR" if col is not None else "YOQ")
except:
    print("YOQ")

# 9. Stock ma'lumotlari
stocks = db.query(Stock).all()
print(f"\n9. Jami sklad yozuvlari: {len(stocks)} ta")
for s in stocks[:5]:
    print(f"   - product_id:{s.product_id} | {s.size} | {s.color} | qty:{s.quantity}")

db.close()
print("\n" + "="*50)
