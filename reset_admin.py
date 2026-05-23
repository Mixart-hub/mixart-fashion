"""
Admin parolini tiklash.
Ishlatish:
    cd C:\pr\mixart_windows\mixart
    python reset_admin.py
"""
import sys, os

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

# .env yuklash
for env_f in [
    os.path.join(BASE_DIR, ".env.windows"),
    os.path.join(BACKEND_DIR, ".env"),
    os.path.join(BASE_DIR, ".env"),
]:
    if os.path.exists(env_f):
        with open(env_f, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        print(f"[OK] .env: {env_f}")
        break

# passlib versiyasini tekshirish
import passlib
print(f"[OK] passlib versiya: {passlib.__version__}")

# Parolni to'g'ri hash qilish
from passlib.context import CryptContext
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

PHONE    = "+998900000000"
PASSWORD = "admin123"

def make_hash(p):
    # 72 bayt cheklovi uchun trim
    p_bytes = p.encode("utf-8")[:72]
    p_str = p_bytes.decode("utf-8", errors="ignore")
    return pwd_ctx.hash(p_str)

def check_hash(p, h):
    try:
        p_bytes = p.encode("utf-8")[:72]
        p_str = p_bytes.decode("utf-8", errors="ignore")
        return pwd_ctx.verify(p_str, h)
    except Exception as e:
        print(f"  verify xato: {e}")
        return False

# Test
test_hash = make_hash(PASSWORD)
test_ok = check_hash(PASSWORD, test_hash)
print(f"[OK] Hash test: {'✅' if test_ok else '❌'}")

if not test_ok:
    print("[XATO] Hash ishlamayapti!")
    sys.exit(1)

# DB
from app.db.database import SessionLocal, engine, Base
from app.models.models import User, UserRole, LoyaltyAccount
import random, string

Base.metadata.create_all(bind=engine)
db = SessionLocal()

def gen_ref():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

print("\n=== Bazadagi foydalanuvchilar ===")
users = db.query(User).all()
for u in users:
    has_hash = "✅ parol bor" if u.password_hash else "❌ parol yo'q"
    print(f"  ID:{u.id} | {u.full_name} | {u.phone} | {u.role} | {has_hash}")

# Admin topish
admin = db.query(User).filter(User.role == UserRole.ADMIN).first()

if not admin:
    print("\n❌ Admin topilmadi — yangi admin yaratilmoqda...")
    admin = User(
        full_name="Super Admin",
        phone=PHONE,
        password_hash=make_hash(PASSWORD),
        role=UserRole.ADMIN,
        language="uz",
        is_active=True
    )
    db.add(admin)
    db.flush()
    if not db.query(LoyaltyAccount).filter(LoyaltyAccount.user_id == admin.id).first():
        db.add(LoyaltyAccount(user_id=admin.id, referral_code=gen_ref()))
    db.commit()
    db.refresh(admin)
    print(f"✅ Admin yaratildi! ID={admin.id}")
else:
    print(f"\n[INFO] Admin topildi: ID={admin.id}")
    admin.password_hash = make_hash(PASSWORD)
    admin.is_active = True
    if not admin.phone:
        admin.phone = PHONE
    db.commit()
    print("✅ Admin paroli yangilandi!")

# Tekshirish
ok = check_hash(PASSWORD, admin.password_hash)
print(f"\n{'='*40}")
print(f"Telefon : {admin.phone}")
print(f"Parol   : {PASSWORD}")
print(f"Hash OK : {'✅ ISHLAYDI' if ok else '❌ ISHLAMAYDI'}")
print(f"\nAdmin panelga kiring:")
print(f"  http://localhost:8000/admin")
print(f"  Telefon: {admin.phone}")
print(f"  Parol  : {PASSWORD}")

db.close()
