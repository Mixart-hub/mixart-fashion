from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.db.database import get_db
from app.models.models import Branch, User, UserRole, LoyaltyAccount, Order
from app.core.security import get_password_hash
import random, string

router_branches = APIRouter()
router_users = APIRouter()

# ────────────────────────────────────────────────────────
# BRANCHES
# ────────────────────────────────────────────────────────
@router_branches.get("/")
def list_branches(active_only: bool = True, db: Session = Depends(get_db)):
    q = db.query(Branch)
    if active_only:
        q = q.filter(Branch.is_active == True)
    return [_branch_dict(b) for b in q.all()]

def _branch_dict(b: Branch) -> dict:
    return {
        "id": b.id, "name": b.name, "address": b.address,
        "phone": b.phone, "is_active": b.is_active,
        "latitude": b.latitude, "longitude": b.longitude,
    }

@router_branches.post("/")
def create_branch(data: dict, db: Session = Depends(get_db)):
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(400, "Filial nomi kiritilmagan")
    b = Branch(
        name=name,
        address=data.get("address", "").strip(),
        phone=data.get("phone", "").strip(),
        is_active=data.get("is_active", True),
        latitude=data.get("latitude") or None,
        longitude=data.get("longitude") or None,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return _branch_dict(b)

@router_branches.put("/{branch_id}")
def update_branch(branch_id: int, data: dict, db: Session = Depends(get_db)):
    b = db.query(Branch).filter(Branch.id == branch_id).first()
    if not b:
        raise HTTPException(404, "Filial topilmadi")
    for k in ["name", "address", "phone", "is_active", "latitude", "longitude"]:
        if k in data:
            setattr(b, k, data[k] or None if k in ("latitude","longitude") else data[k])
    db.commit()
    db.refresh(b)
    return _branch_dict(b)

@router_branches.delete("/{branch_id}")
def delete_branch(branch_id: int, db: Session = Depends(get_db)):
    b = db.query(Branch).filter(Branch.id == branch_id).first()
    if not b:
        raise HTTPException(404, "Topilmadi")
    b.is_active = False
    db.commit()
    return {"ok": True}


# ────────────────────────────────────────────────────────
# USERS / STAFF
# ────────────────────────────────────────────────────────
def _user_to_dict(u: User, branch: Optional[Branch] = None):
    """User obyektini dict ga aylantirish (branch_name bilan)."""
    return {
        "id": u.id,
        "full_name": u.full_name,
        "phone": u.phone,
        "telegram_id": u.telegram_id,
        "role": u.role.value if hasattr(u.role, "value") else u.role,
        "branch_id": u.branch_id,
        "branch_name": branch.name if branch else None,
        "is_active": u.is_active,
        "language": u.language,
        "created_at": u.created_at,
    }

@router_users.get("/")
def list_users(
    role: Optional[str] = Query(None),
    branch_id: Optional[int] = Query(None),
    active_only: bool = Query(True),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    q = db.query(User)

    if active_only:
        q = q.filter(User.is_active == True)

    if role:
        # "staff" - admin/operator/seller (mijoz emas)
        if role == "staff":
            q = q.filter(User.role.in_(["admin", "operator", "seller"]))
        else:
            q = q.filter(User.role == role)

    if branch_id:
        q = q.filter(User.branch_id == branch_id)

    users = q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    # Branch nomlarini olish
    branch_ids = {u.branch_id for u in users if u.branch_id}
    branches_map = {}
    if branch_ids:
        branches = db.query(Branch).filter(Branch.id.in_(branch_ids)).all()
        branches_map = {b.id: b for b in branches}

    return [_user_to_dict(u, branches_map.get(u.branch_id)) for u in users]

@router_users.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Foydalanuvchi topilmadi")
    branch = None
    if u.branch_id:
        branch = db.query(Branch).filter(Branch.id == u.branch_id).first()
    return _user_to_dict(u, branch)

@router_users.post("/staff")
def create_staff(data: dict, db: Session = Depends(get_db)):
    """Yangi xodim qo'shish (admin/operator/seller)."""
    phone = data.get("phone", "").strip()
    full_name = data.get("full_name", "").strip()
    password = data.get("password", "")
    role = data.get("role", "operator")

    if not phone or not full_name:
        raise HTTPException(400, "Ism va telefon majburiy")
    if not password or len(password) < 6:
        raise HTTPException(400, "Parol kamida 6 ta belgi bo'lishi kerak")
    if role not in ["admin", "operator", "seller"]:
        raise HTTPException(400, "Notog\'ri rol")

    # Telefon takrorlanishini tekshirish
    if db.query(User).filter(User.phone == phone).first():
        raise HTTPException(400, "Bu telefon allaqachon mavjud")

    user = User(
        full_name=full_name,
        phone=phone,
        password_hash=get_password_hash(password),
        role=UserRole(role),
        branch_id=data.get("branch_id") or None,
        language=data.get("language", "uz"),
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Loyalty (referral kod)
    if not db.query(LoyaltyAccount).filter(LoyaltyAccount.user_id == user.id).first():
        ref = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
        db.add(LoyaltyAccount(user_id=user.id, referral_code=ref))

    db.commit()
    db.refresh(user)

    branch = None
    if user.branch_id:
        branch = db.query(Branch).filter(Branch.id == user.branch_id).first()
    return _user_to_dict(user, branch)


@router_users.put("/{user_id}")
def update_user(user_id: int, data: dict, db: Session = Depends(get_db)):
    """Xodim ma'lumotlarini va parolini o'zgartirish."""
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Foydalanuvchi topilmadi")

    # Telefon takrorlanishi
    new_phone = data.get("phone")
    if new_phone and new_phone != u.phone:
        if db.query(User).filter(User.phone == new_phone, User.id != user_id).first():
            raise HTTPException(400, "Bu telefon allaqachon ishlatilgan")

    for k in ["full_name", "phone", "language"]:
        if k in data and data[k] is not None:
            setattr(u, k, data[k])

    if "branch_id" in data:
        u.branch_id = data["branch_id"] or None

    if "role" in data and data["role"]:
        try:
            u.role = UserRole(data["role"])
        except ValueError:
            raise HTTPException(400, "Notog\'ri rol")

    if "is_active" in data:
        u.is_active = bool(data["is_active"])

    if data.get("password"):
        if len(data["password"]) < 6:
            raise HTTPException(400, "Parol kamida 6 ta belgi")
        u.password_hash = get_password_hash(data["password"])

    db.commit()
    db.refresh(u)

    branch = None
    if u.branch_id:
        branch = db.query(Branch).filter(Branch.id == u.branch_id).first()
    return _user_to_dict(u, branch)


@router_users.patch("/{user_id}/change-password")
def change_password(user_id: int, data: dict, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Topilmadi")
    new_pass = data.get("new_password", "")
    if len(new_pass) < 6:
        raise HTTPException(400, "Parol kamida 6 ta belgi")
    u.password_hash = get_password_hash(new_pass)
    db.commit()
    return {"ok": True, "message": "Parol o\'zgartirildi"}


@router_users.patch("/{user_id}/role")
def update_role(user_id: int, role: str, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Topilmadi")
    if role not in ["admin", "operator", "seller", "customer"]:
        raise HTTPException(400, "Notog\'ri rol")
    u.role = UserRole(role)
    db.commit()
    return {"ok": True}


@router_users.patch("/{user_id}/block")
def toggle_block(user_id: int, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Topilmadi")
    u.is_active = not u.is_active
    db.commit()
    return {"ok": True, "is_active": u.is_active}


@router_users.delete("/{user_id}")
def soft_delete_user(user_id: int, db: Session = Depends(get_db)):
    """Soft delete - is_active=False qilib qo'yadi."""
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Topilmadi")
    u.is_active = False
    db.commit()
    return {"ok": True}


@router_users.patch("/{user_id}/link-telegram")
def link_telegram(user_id: int, data: dict, db: Session = Depends(get_db)):
    """Admin: xodimga Telegram ID ulash yoki uzish."""
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Foydalanuvchi topilmadi")
    telegram_id = data.get("telegram_id", "").strip() or None
    if telegram_id:
        existing = db.query(User).filter(
            User.telegram_id == telegram_id, User.id != user_id
        ).first()
        if existing:
            raise HTTPException(400, f"Bu Telegram ID allaqachon {existing.full_name} ga ulangan")
    u.telegram_id = telegram_id
    db.commit()
    return {"ok": True, "telegram_id": u.telegram_id}


@router_users.get("/{user_id}/activity")
def user_activity(user_id: int, db: Session = Depends(get_db)):
    """Xodim faoliyati: so'nggi buyurtmalar, statistika."""
    from app.models.models import Order
    from sqlalchemy import func
    from datetime import date, datetime, timedelta

    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Topilmadi")

    today = date.today()
    month_start = datetime.combine(today.replace(day=1), datetime.min.time())

    branch = db.query(Branch).filter(Branch.id == u.branch_id).first() if u.branch_id else None

    # Ushbu xodim tasdiqlagan buyurtmalar (operator_id bo'yicha)
    orders_total = db.query(func.count(Order.id)).filter(
        Order.operator_id == user_id
    ).scalar() or 0
    orders_month = db.query(func.count(Order.id)).filter(
        Order.operator_id == user_id,
        Order.created_at >= month_start
    ).scalar() or 0

    return {
        "user": _user_to_dict(u, branch),
        "orders_total": orders_total,
        "orders_this_month": orders_month,
        "branch": {"id": branch.id, "name": branch.name} if branch else None,
    }


@router_users.get("/{user_id}/loyalty")
def get_user_loyalty(user_id: int, db: Session = Depends(get_db)):
    """Foydalanuvchi loyallik ma'lumotlari."""
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Foydalanuvchi topilmadi")

    loyalty = db.query(LoyaltyAccount).filter(LoyaltyAccount.user_id == user_id).first()

    total_orders = db.query(func.count(Order.id)).filter(Order.customer_id == user_id).scalar() or 0
    total_spent = db.query(func.coalesce(func.sum(Order.final_amount), 0)).filter(
        Order.customer_id == user_id,
        Order.status.in_(["delivered", "processing", "shipped"])
    ).scalar() or 0

    level = "bronze"
    points = 0
    referral_code = None
    total_spent_loyalty = 0

    if loyalty:
        level = loyalty.level or "bronze"
        points = loyalty.points or 0
        referral_code = loyalty.referral_code
        total_spent_loyalty = loyalty.total_spent or 0

    next_level_map = {"bronze": ("silver", 150), "silver": ("gold", 500), "gold": (None, None)}
    next_level, next_threshold = next_level_map.get(level, (None, None))
    progress = 0
    if next_threshold:
        progress = min(100, int((total_spent_loyalty / next_threshold) * 100))

    return {
        "level": level,
        "points": points,
        "referral_code": referral_code,
        "total_spent": round(float(total_spent_loyalty), 2),
        "total_orders": total_orders,
        "next_level": next_level,
        "next_threshold": next_threshold,
        "progress": progress,
        "discount_percent": {"gold": 10, "silver": 5, "bronze": 0}.get(level, 0),
    }
