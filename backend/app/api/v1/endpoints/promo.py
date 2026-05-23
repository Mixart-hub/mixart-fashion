from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import PromoCode
from datetime import datetime

router = APIRouter()

@router.get("/")
def list_promos(db: Session = Depends(get_db)):
    return db.query(PromoCode).order_by(PromoCode.id.desc()).all()

@router.post("/")
def create_promo(data: dict, db: Session = Depends(get_db)):
    code = data.get("code", "").strip().upper()
    if not code:
        raise HTTPException(400, "Kod kiritilmagan")
    pct = float(data.get("discount_percent", 0))
    if pct <= 0 or pct > 100:
        raise HTTPException(400, "Chegirma 1-100 oraligida bo'lishi kerak")
    existing = db.query(PromoCode).filter(PromoCode.code == code).first()
    if existing:
        raise HTTPException(400, f"'{code}' kodi allaqachon mavjud")
    valid_until = None
    if data.get("valid_until"):
        try: valid_until = datetime.fromisoformat(data["valid_until"])
        except: pass
    promo = PromoCode(
        code=code,
        discount_percent=pct,
        max_uses=int(data.get("max_uses", 100)),
        valid_until=valid_until,
        is_active=True
    )
    db.add(promo); db.commit(); db.refresh(promo)
    return promo

@router.get("/check")
def check_promo(code: str, db: Session = Depends(get_db)):
    p = db.query(PromoCode).filter(PromoCode.code == code.upper(), PromoCode.is_active == True).first()
    if not p: raise HTTPException(404, "Promo kod topilmadi")
    if p.valid_until and p.valid_until < datetime.utcnow():
        raise HTTPException(400, "Promo kod muddati tugagan")
    if p.used_count >= p.max_uses:
        raise HTTPException(400, "Promo kod limitga yetgan")
    return {"code": p.code, "discount_percent": p.discount_percent, "valid": True}

@router.delete("/{promo_id}")
def delete_promo(promo_id: int, db: Session = Depends(get_db)):
    p = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if not p: raise HTTPException(404, "Topilmadi")
    db.delete(p); db.commit()
    return {"ok": True}

@router.patch("/{promo_id}/toggle")
def toggle_promo(promo_id: int, db: Session = Depends(get_db)):
    p = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if not p: raise HTTPException(404, "Topilmadi")
    p.is_active = not p.is_active
    db.commit()
    return {"ok": True, "is_active": p.is_active}
