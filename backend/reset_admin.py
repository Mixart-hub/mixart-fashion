"""
Admin parolini tiklash skripti.
Ishlatish: python reset_admin.py
"""
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, engine, Base
from app.models.models import User, UserRole
from app.core.security import get_password_hash

Base.metadata.create_all(bind=engine)
db = SessionLocal()

NEW_PASSWORD = "Admin@2025"

try:
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not admin:
        print("Admin topilmadi! Avval seed.py ni ishga tushiring.")
        sys.exit(1)

    admin.password_hash = get_password_hash(NEW_PASSWORD)
    db.commit()
    print("=" * 45)
    print(f"  Admin parol tiklandi!")
    print(f"  Telefon : {admin.phone}")
    print(f"  Email   : {admin.email or 'belgilanmagan'}")
    print(f"  Yangi parol: {NEW_PASSWORD}")
    print("=" * 45)
    print("Kirganingizdan keyin Sozlamalar -> Parolni o'zgartiring!")
finally:
    db.close()
