"""
Admin yaratish. Ishlatish:
    cd C:\pr\mixart_windows\mixart
    python create_admin.py
"""
import sys, os, bcrypt

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
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
        print(f"[OK] .env: {env_f}"); break

PHONE    = "+998977476151"
PASSWORD = "Malika05081997"

def mkhash(p):
    b = p.encode("utf-8")[:72]
    return bcrypt.hashpw(b, bcrypt.gensalt()).decode("utf-8")

def chkhash(p, h):
    try: return bcrypt.checkpw(p.encode("utf-8")[:72], h.encode("utf-8"))
    except: return False

# Test
h = mkhash(PASSWORD)
print(f"Hash test: {'OK' if chkhash(PASSWORD,h) else 'XATO'}")

from app.db.database import SessionLocal, engine, Base
from app.models.models import User, UserRole, LoyaltyAccount
import random, string

Base.metadata.create_all(bind=engine)
db = SessionLocal()

existing = db.query(User).filter(User.phone == PHONE).first()
if existing:
    existing.password_hash = mkhash(PASSWORD)
    existing.role = UserRole.ADMIN
    existing.is_active = True
    db.commit()
    print(f"Yangilandi: {existing.full_name}")
else:
    u = User(full_name="Admin", phone=PHONE,
             password_hash=mkhash(PASSWORD),
             role=UserRole.ADMIN, language="uz", is_active=True)
    db.add(u); db.flush()
    db.add(LoyaltyAccount(user_id=u.id,
           referral_code=''.join(random.choices(string.ascii_uppercase+string.digits,k=8))))
    db.commit(); db.refresh(u)
    print(f"Yaratildi: ID={u.id}")

admin = db.query(User).filter(User.phone==PHONE).first()
ok = chkhash(PASSWORD, admin.password_hash)
print(f"\n{'='*40}")
print(f"  Telefon : {PHONE}")
print(f"  Parol   : {PASSWORD}")
print(f"  Status  : {'ISHLAYDI' if ok else 'ISHLAMAYDI'}")
print(f"\n  http://localhost:8000/admin")
print(f"{'='*40}")
db.close()
