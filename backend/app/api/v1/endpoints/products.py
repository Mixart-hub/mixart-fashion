from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List
from app.db.database import get_db
from app.models.models import Product, Category, Stock, Review, Favorite, FlashSale
from app.core.security import get_current_user, require_role
from datetime import datetime
import os, uuid, shutil
from app.core.config import settings

router = APIRouter()

@router.get("/")
def list_products(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    is_trending: Optional[bool] = None,
    is_new_arrival: Optional[bool] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    skip: int = 0, limit: int = 20,
    db: Session = Depends(get_db)
):
    q = db.query(Product).filter(Product.is_active == True)
    if category_id: q = q.filter(Product.category_id == category_id)
    if search: q = q.filter(Product.name_uz.ilike(f"%{search}%"))
    if is_trending is not None: q = q.filter(Product.is_trending == is_trending)
    if is_new_arrival is not None: q = q.filter(Product.is_new_arrival == is_new_arrival)
    if min_price: q = q.filter(Product.price >= min_price)
    if max_price: q = q.filter(Product.price <= max_price)
    total = q.count()
    items = q.order_by(desc(Product.created_at)).offset(skip).limit(limit).all()
    return {"total": total, "skip": skip, "limit": limit, "items": items}

@router.get("/trending")
def trending(limit: int = 10, db: Session = Depends(get_db)):
    items = db.query(Product).filter(
        Product.is_active == True, Product.is_trending == True
    ).order_by(desc(Product.sales_count)).limit(limit).all()
    return items

@router.get("/flash-sale")
def flash_sale(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    sale = db.query(FlashSale).filter(
        FlashSale.is_active == True,
        FlashSale.starts_at <= now,
        FlashSale.ends_at >= now
    ).first()
    if not sale:
        return {"active": False}
    products = db.query(Product).filter(Product.id.in_(sale.product_ids)).all()
    return {"active": True, "sale": sale, "products": products}

@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.is_active == True, Category.parent_id == None).order_by(Category.sort_order).all()

def _product_to_dict(p):
    """Product modelni dict ga to'liq aylantirish - tahrirlash uchun barcha maydonlar."""
    return {
        "id": p.id,
        "name_uz": p.name_uz or "",
        "name_ru": p.name_ru or "",
        "name_en": getattr(p, "name_en", None) or "",
        "description_uz": p.description_uz or "",
        "description_ru": p.description_ru or "",
        "material": p.material or "",
        "care_instructions": p.care_instructions or "",
        "category_id": p.category_id,
        "price": float(p.price) if p.price else 0,
        "old_price": float(p.old_price) if p.old_price else None,
        "sizes": p.sizes if isinstance(p.sizes, list) else (p.sizes or []),
        "colors": p.colors if isinstance(p.colors, list) else (p.colors or []),
        "images": p.images if isinstance(p.images, list) else (p.images or []),
        "is_active": p.is_active,
        "is_trending": p.is_trending,
        "is_new_arrival": p.is_new_arrival,
        "views_count": p.views_count or 0,
    }

@router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Mahsulotni tahrirlash uchun to'liq ma'lumot bilan qaytarish."""
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Mahsulot topilmadi")

    # Views count
    p.views_count = (p.views_count or 0) + 1
    db.commit()

    # Stocks - branch_name bilan
    stocks_data = []
    stocks_q = db.query(Stock).filter(Stock.product_id == product_id).all()
    branch_ids = {s.branch_id for s in stocks_q if s.branch_id}
    branches_map = {}
    if branch_ids:
        from app.models.models import Branch
        for b in db.query(Branch).filter(Branch.id.in_(branch_ids)).all():
            branches_map[b.id] = b
    for s in stocks_q:
        b = branches_map.get(s.branch_id) if s.branch_id else None
        stocks_data.append({
            "id": s.id,
            "size": s.size,
            "color": s.color,
            "quantity": s.quantity,
            "min_quantity": s.min_quantity,
            "branch_id": s.branch_id,
            "branch_name": b.name if b else None,
        })

    # Reviews
    reviews = db.query(Review).filter(
        Review.product_id == product_id,
        Review.is_approved == True
    ).all()
    avg = db.query(func.avg(Review.rating)).filter(
        Review.product_id == product_id,
        Review.is_approved == True
    ).scalar() or 0

    return {
        "product": _product_to_dict(p),
        "stocks": stocks_data,
        "reviews": [{"id": r.id, "rating": r.rating, "comment": r.comment} for r in reviews],
        "avg_rating": round(float(avg), 1),
        "review_count": len(reviews)
    }

@router.post("/")
def create_product(data: dict, db: Session = Depends(get_db)):
    if not data.get("name_uz"):
        raise HTTPException(400, "Mahsulot nomi kiritilmagan")
    if not data.get("price") or float(data.get("price", 0)) <= 0:
        raise HTTPException(400, "Narx notog\'ri")

    allowed = ["name_uz", "name_ru", "name_en", "description_uz", "description_ru",
               "material", "care_instructions", "category_id", "price", "old_price",
               "sizes", "colors", "images", "is_active", "is_trending", "is_new_arrival"]
    clean_data = {k: data[k] for k in allowed if k in data}

    # old_price 0 yoki bo'sh bo'lsa null
    if clean_data.get("old_price") in (0, "", None):
        clean_data.pop("old_price", None)

    p = Product(**clean_data)
    db.add(p)
    db.commit()
    db.refresh(p)
    return _product_to_dict(p)

@router.put("/{product_id}")
def update_product(product_id: int, data: dict, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Mahsulot topilmadi")

    # Faqat ruxsat etilgan maydonlarni yangilash
    allowed_fields = [
        "name_uz", "name_ru", "name_en",
        "description_uz", "description_ru",
        "material", "care_instructions", "category_id",
        "price", "old_price",
        "sizes", "colors", "images",
        "is_active", "is_trending", "is_new_arrival",
    ]
    for k in allowed_fields:
        if k in data:
            v = data[k]
            # Bo'sh string null qilish
            if k in ["old_price"] and (v == "" or v == 0):
                v = None
            setattr(p, k, v)

    db.commit()
    db.refresh(p)
    return _product_to_dict(p)

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p: raise HTTPException(404, "Topilmadi")
    p.is_active = False
    db.commit()
    return {"ok": True}

@router.get("/{product_id}/stock")
def get_stock(product_id: int, db: Session = Depends(get_db)):
    stocks = db.query(Stock).filter(Stock.product_id == product_id).all()
    low = [s for s in stocks if s.quantity <= s.min_quantity]
    return {"stocks": [{"size": s.size, "color": s.color, "quantity": s.quantity, "branch_id": s.branch_id} for s in stocks], "low_stock": low}

@router.put("/{product_id}/stock")
def update_stock(product_id: int, size: str, color: str, quantity: int, db: Session = Depends(get_db)):
    s = db.query(Stock).filter(Stock.product_id == product_id, Stock.size == size, Stock.color == color).first()
    if not s:
        s = Stock(product_id=product_id, size=size, color=color, quantity=quantity)
        db.add(s)
    else:
        s.quantity = quantity
    db.commit()
    return s

@router.post("/{product_id}/review")
def add_review(product_id: int, user_id: int, rating: int, comment: str = None, db: Session = Depends(get_db)):
    if not 1 <= rating <= 5: raise HTTPException(400, "Reyting 1-5 orasida bo'lishi kerak")
    r = Review(product_id=product_id, user_id=user_id, rating=rating, comment=comment)
    db.add(r)
    db.commit()
    return r

@router.post("/{product_id}/favorite")
def toggle_favorite(product_id: int, user_id: int, db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(Favorite.user_id == user_id, Favorite.product_id == product_id).first()
    if fav:
        db.delete(fav)
        db.commit()
        return {"favorited": False}
    db.add(Favorite(user_id=user_id, product_id=product_id))
    db.commit()
    return {"favorited": True}

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
        raise HTTPException(400, "Faqat jpg, png, webp formatlar")
    import uuid as _uuid
    filename = f"{_uuid.uuid4()}.{ext}"
    media_path = os.path.abspath(settings.MEDIA_DIR)
    prod_path  = os.path.join(media_path, "products")
    os.makedirs(prod_path, exist_ok=True)
    full_path = os.path.join(prod_path, filename)
    try:
        content_bytes = await file.read()
        with open(full_path, "wb") as f:
            f.write(content_bytes)
        file_size = os.path.getsize(full_path)
        return {"url": f"/media/products/{filename}", "size": file_size, "ok": True}
    except Exception as e:
        raise HTTPException(500, f"Rasm saqlashda xato: {str(e)}")

# ── KATEGORIYA CRUD (admin uchun) ─────────────────────────────────────────
from app.models.models import Category

@router.get("/categories/all-admin")
def get_all_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.sort_order).all()

@router.post("/categories/")
def create_category(data: dict, db: Session = Depends(get_db)):
    cat = Category(**data)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.put("/categories/{cat_id}")
def update_category(cat_id: int, data: dict, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat: raise HTTPException(404, "Topilmadi")
    for k, v in data.items():
        setattr(cat, k, v)
    db.commit()
    return cat

@router.delete("/categories/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat: raise HTTPException(404, "Topilmadi")
    cat.is_active = False
    db.commit()
    return {"ok": True}
