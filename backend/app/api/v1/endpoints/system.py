"""Tizim sozlamalari (valyuta kursi va boshqalar)"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.config import settings
import json, os, logging
from datetime import date

log = logging.getLogger(__name__)

router = APIRouter()

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "system_settings.json")
BOT_SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "bot_settings.json")

BOT_DEFAULTS = {
    "welcome_uz": "",
    "welcome_ru": "",
    "welcome_en": "",
    "help_text": "",
    "operator_welcome": "",
    "seller_welcome": "",
    "btn_shop_uz": "",
    "btn_shop_ru": "",
    "btn_shop_en": "",
}


def load_bot_settings() -> dict:
    data = dict(BOT_DEFAULTS)
    try:
        path = os.path.abspath(BOT_SETTINGS_FILE)
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                data.update(json.load(f))
    except Exception:
        pass
    return data


def save_bot_settings(data: dict):
    path = os.path.abspath(BOT_SETTINGS_FILE)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise HTTPException(500, f"Saqlashda xato: {e}")


router_bot_settings = APIRouter()


@router_bot_settings.get("/")
def get_bot_settings():
    return load_bot_settings()


@router_bot_settings.put("/")
def update_bot_settings(data: dict):
    current = load_bot_settings()
    current.update(data)
    save_bot_settings(current)
    return {"ok": True, "settings": current}

DEFAULTS = {
    "usd_to_uzs": 12700.0,
    "default_currency": "UZS",
    "company_name": "Mixart Fashion",
    "company_phone": "+998 90 000 00 00",
    "company_email": "info@mixart.uz",
}

def load_settings() -> dict:
    data = dict(DEFAULTS)
    try:
        path = os.path.abspath(SETTINGS_FILE)
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                data.update(json.load(f))
    except Exception:
        pass
    return data

def save_settings(data: dict):
    path = os.path.abspath(SETTINGS_FILE)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise HTTPException(500, f"Saqlashda xato: {e}")

@router.get("/")
def get_settings():
    return load_settings()

@router.put("/")
def update_settings(data: dict, db: Session = Depends(get_db)):
    current = load_settings()
    current.update(data)
    save_settings(current)
    return {"ok": True, "settings": current}

@router.get("/currency-rate")
def get_currency_rate():
    s = load_settings()
    return {"usd_to_uzs": s.get("usd_to_uzs", 12700.0)}


@router.get("/fetch-usd-rate")
async def fetch_live_usd_rate():
    """CBU.uz dan dollar kursini real vaqtda olish va saqlash."""
    try:
        import httpx
        today_str = date.today().strftime("%d.%m.%Y")
        url = f"https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/{today_str}/"
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, follow_redirects=True)
        if resp.status_code == 200:
            data = resp.json()
            if data and isinstance(data, list) and len(data) > 0:
                rate = float(data[0].get("Rate", 0))
                if rate > 1000:
                    current = load_settings()
                    current["usd_to_uzs"] = rate
                    save_settings(current)
                    log.info(f"USD kurs yangilandi: {rate}")
                    return {"usd_to_uzs": rate, "source": "cbu.uz", "date": today_str, "live": True}
    except Exception as e:
        log.warning(f"CBU kurs olishda xato: {e}")
    s = load_settings()
    return {"usd_to_uzs": s.get("usd_to_uzs", 12700.0), "source": "cached", "live": False}


@router.get("/branch-report/{branch_id}")
def branch_report(branch_id: int, period: str = "month", db: Session = Depends(get_db)):
    """Bitta filial bo'yicha to'liq hisobot."""
    from app.models.models import Branch, Order, OrderItem, Product, User, Stock
    from sqlalchemy import func
    from datetime import datetime, timedelta

    b = db.query(Branch).filter(Branch.id == branch_id).first()
    if not b:
        raise HTTPException(404, "Filial topilmadi")

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "today":
        start = today
    elif period == "week":
        start = today - timedelta(days=7)
    else:
        start = today.replace(day=1)

    orders = db.query(Order).filter(
        Order.branch_id == branch_id,
        Order.created_at >= start
    ).all()

    total_rev = sum(o.final_amount for o in orders)
    paid_rev = sum(o.final_amount for o in orders if str(o.payment_status) in ("paid", "PaymentStatus.paid"))
    by_status = {}
    for o in orders:
        st = o.status.value if hasattr(o.status, "value") else str(o.status)
        by_status[st] = by_status.get(st, 0) + 1

    top_products = db.query(
        Product.name_uz, func.sum(OrderItem.quantity).label("qty"),
        func.sum(OrderItem.quantity * OrderItem.price).label("revenue")
    ).join(OrderItem, OrderItem.product_id == Product.id
    ).join(Order, Order.id == OrderItem.order_id
    ).filter(Order.branch_id == branch_id, Order.created_at >= start
    ).group_by(Product.id, Product.name_uz
    ).order_by(func.sum(OrderItem.quantity).desc()).limit(10).all()

    staff = db.query(User).filter(
        User.branch_id == branch_id,
        User.role.in_(["operator", "seller", "admin"]),
        User.is_active == True
    ).all()

    staff_stats = []
    for u in staff:
        orders_by = db.query(func.count(Order.id)).filter(
            Order.operator_id == u.id, Order.created_at >= start
        ).scalar() or 0
        staff_stats.append({
            "id": u.id, "full_name": u.full_name,
            "role": u.role.value if hasattr(u.role, "value") else str(u.role),
            "orders_count": orders_by,
            "telegram_id": u.telegram_id,
        })

    stock_data = db.query(
        func.count(Stock.id),
        func.coalesce(func.sum(Stock.quantity), 0),
        func.coalesce(func.sum(Stock.quantity * Product.price), 0)
    ).join(Product, Product.id == Stock.product_id
    ).filter(Stock.branch_id == branch_id).first()

    low_stock = db.query(func.count(Stock.id)).filter(
        Stock.branch_id == branch_id,
        Stock.quantity > 0,
        Stock.quantity <= Stock.min_quantity
    ).scalar() or 0

    zero_stock = db.query(func.count(Stock.id)).filter(
        Stock.branch_id == branch_id,
        Stock.quantity == 0
    ).scalar() or 0

    return {
        "branch": {"id": b.id, "name": b.name, "address": b.address, "phone": b.phone},
        "period": period,
        "orders": {"total": len(orders), "revenue": round(total_rev, 2), "paid": round(paid_rev, 2), "by_status": by_status},
        "top_products": [{"name": p.name_uz, "qty": int(p.qty), "revenue": round(float(p.revenue or 0), 2)} for p in top_products],
        "staff": staff_stats,
        "stock": {
            "items": int(stock_data[0] or 0),
            "total_qty": int(stock_data[1] or 0),
            "value": round(float(stock_data[2] or 0), 2),
            "low_stock": int(low_stock),
            "zero_stock": int(zero_stock),
        }
    }
