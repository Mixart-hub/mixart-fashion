from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.database import get_db
from app.models.models import FlashSale, PromoCode, Notification
import httpx

router_flash = APIRouter()
router_promo = APIRouter()
router_notify = APIRouter()

# ─── FLASH SALE ──────────────────────────────────────────
@router_flash.get("/active")
def active_flash(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    sale = db.query(FlashSale).filter(
        FlashSale.is_active == True,
        FlashSale.starts_at <= now,
        FlashSale.ends_at >= now
    ).first()
    if not sale:
        return {"active": False}
    return {"active": True, "sale": {
        "id": sale.id,
        "discount_percent": sale.discount_percent,
        "starts_at": sale.starts_at,
        "ends_at": sale.ends_at,
        "product_ids": sale.product_ids or [],
        "is_active": sale.is_active,
    }}

@router_flash.get("/")
def list_flash(db: Session = Depends(get_db)):
    sales = db.query(FlashSale).order_by(FlashSale.id.desc()).limit(50).all()
    return [{"id": s.id, "discount_percent": s.discount_percent,
             "starts_at": s.starts_at, "ends_at": s.ends_at,
             "is_active": s.is_active, "product_ids": s.product_ids or []} for s in sales]

@router_flash.post("/")
def create_flash(data: dict, db: Session = Depends(get_db)):
    def _dt(v):
        if not v:
            raise HTTPException(400, "Vaqt kiritilmagan")
        if isinstance(v, datetime):
            return v
        s = str(v).replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(s)
        except Exception:
            return datetime.utcnow()
    sale = FlashSale(
        discount_percent=float(data.get("discount_percent", 0)),
        starts_at=_dt(data.get("starts_at")),
        ends_at=_dt(data.get("ends_at")),
        is_active=bool(data.get("is_active", True)),
        product_ids=data.get("product_ids") or [],
        category_ids=data.get("category_ids") or [],
        title_uz=data.get("title_uz") or "",
        title_ru=data.get("title_ru") or "",
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return {"id": sale.id, "discount_percent": sale.discount_percent,
            "starts_at": sale.starts_at, "ends_at": sale.ends_at,
            "is_active": sale.is_active}

@router_flash.delete("/{sale_id}")
def delete_flash(sale_id: int, db: Session = Depends(get_db)):
    s = db.query(FlashSale).filter(FlashSale.id == sale_id).first()
    if not s: raise HTTPException(404, "Topilmadi")
    s.is_active = False
    db.commit()
    return {"ok": True}

# ─── PROMO CODES ─────────────────────────────────────────
@router_promo.get("/")
def list_promos(db: Session = Depends(get_db)):
    return db.query(PromoCode).all()

@router_promo.post("/")
def create_promo(data: dict, db: Session = Depends(get_db)):
    if db.query(PromoCode).filter(PromoCode.code == data["code"]).first():
        raise HTTPException(400, "Bu kod allaqachon mavjud")
    p = PromoCode(**data)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

@router_promo.get("/check/{code}")
def check_promo(code: str, db: Session = Depends(get_db)):
    p = db.query(PromoCode).filter(PromoCode.code == code.upper(), PromoCode.is_active == True).first()
    if not p: return {"valid": False, "message": "Kod topilmadi"}
    if p.valid_until and p.valid_until < datetime.utcnow():
        return {"valid": False, "message": "Muddati tugagan"}
    if p.used_count >= p.max_uses:
        return {"valid": False, "message": "Limit tugagan"}
    return {"valid": True, "discount_percent": p.discount_percent, "code": p.code}

@router_promo.delete("/{promo_id}")
def delete_promo(promo_id: int, db: Session = Depends(get_db)):
    p = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if not p: raise HTTPException(404, "Topilmadi")
    p.is_active = False
    db.commit()
    return {"ok": True}

# ─── NOTIFICATIONS ───────────────────────────────────────
@router_notify.post("/send")
def send_notification(title: str, body: str, user_id: int = None, db: Session = Depends(get_db)):
    """Bitta foydalanuvchiga xabar qo'shish (worker yuboradi)."""
    n = Notification(title=title, body=body, user_id=user_id, is_sent=False)
    db.add(n)
    db.commit()
    db.refresh(n)
    return {"ok": True, "id": n.id}

@router_notify.get("/pending")
def get_pending_notifications(limit: int = 30, db: Session = Depends(get_db)):
    """Worker uchun - yuborilmagan xabarlar (telegram_id bor mijozlarga)."""
    from app.models.models import User
    notifications = db.query(Notification, User).join(
        User, User.id == Notification.user_id
    ).filter(
        Notification.is_sent == False,
        Notification.failed_count < 3,
        User.telegram_id != None,
        User.is_active == True
    ).order_by(Notification.created_at.asc()).limit(limit).all()

    return [
        {
            "id": n.id,
            "user_id": n.user_id,
            "telegram_id": u.telegram_id,
            "title": n.title or "",
            "body": n.body or "",
            "created_at": n.created_at,
        }
        for n, u in notifications
    ]

@router_notify.patch("/{notif_id}/sent")
def mark_notification_sent(notif_id: int, db: Session = Depends(get_db)):
    """Worker - xabar yuborildi deb belgilash."""
    from datetime import datetime
    n = db.query(Notification).filter(Notification.id == notif_id).first()
    if not n:
        raise HTTPException(404, "Topilmadi")
    n.is_sent = True
    n.sent_at = datetime.utcnow()
    db.commit()
    return {"ok": True}

@router_notify.patch("/{notif_id}/failed")
def mark_notification_failed(notif_id: int, data: dict = None, db: Session = Depends(get_db)):
    """Worker - xabar yuborilmadi (failed_count oshadi)."""
    n = db.query(Notification).filter(Notification.id == notif_id).first()
    if not n:
        raise HTTPException(404, "Topilmadi")
    n.failed_count = (n.failed_count or 0) + 1
    if data and data.get("reason"):
        n.failed_reason = str(data["reason"])[:500]
    db.commit()
    return {"ok": True, "failed_count": n.failed_count}

@router_notify.get("/user/{user_id}")
def user_notifications(user_id: int, db: Session = Depends(get_db)):
    """Mijoz uchun xabarlar tarixi."""
    return db.query(Notification).filter(
        Notification.user_id == user_id,
    ).order_by(Notification.created_at.desc()).limit(20).all()

# ─── BOT SOZLAMALARI ──────────────────────────────────────────────────────
from app.models.models import User
import json, os

BOT_SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "bot_settings.json")

def load_bot_settings() -> dict:
    defaults = {
        "welcome_uz": "Assalomu alaykum, {name}! 👗\n\nMixart Fashion do'koniga xush kelibsiz!\n\nQuyidagi tugmani bosib xarid qiling:",
        "welcome_ru": "Привет, {name}! 👗\n\nДобро пожаловать в Mixart Fashion!\n\nНажмите кнопку ниже:",
        "btn_shop_uz": "🛍 Do'konni ochish",
        "btn_shop_ru": "🛍 Открыть магазин",
        "help_text": "📞 Aloqa:\n\n📱 Telefon: +998 90 000 00 00\n📧 Email: info@mixart.uz",
        "operator_welcome": "Assalomu alaykum, {name}! 👋\n\nSiz operator sifatida kirdingiz.\n\n/orders — Yangi buyurtmalar\n/stats — Statistika",
        "seller_welcome": "Assalomu alaykum, {name}! 👋\n\nSiz sotuvchi sifatida kirdingiz.\n\n/orders — Yangi buyurtmalar",
        "order_new_text": "🆕 Yangi buyurtma #{id}\n\n👤 Mijoz: {customer}\n💰 Summa: ${amount}\n📍 Manzil: {address}",
        "broadcast_enabled": True,
    }
    try:
        path = os.path.abspath(BOT_SETTINGS_FILE)
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                saved = json.load(f)
                defaults.update(saved)
    except Exception:
        pass
    return defaults

def save_bot_settings(data: dict):
    path = os.path.abspath(BOT_SETTINGS_FILE)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise HTTPException(500, f"Saqlashda xato: {e}")

router_bot = APIRouter()

@router_bot.get("/settings")
def get_bot_settings():
    return load_bot_settings()

@router_bot.put("/settings")
def update_bot_settings(data: dict, db: Session = Depends(get_db)):
    save_bot_settings(data)
    return {"ok": True, "message": "Bot sozlamalari saqlandi"}


def _get_target_users(role: str, language: str, branch_id: int, min_orders: int, db: Session) -> list:
    """Maqsadli foydalanuvchilar ro'yxatini olish."""
    from sqlalchemy import func
    q = db.query(User).filter(User.is_active == True, User.telegram_id != None)

    if role == "staff":
        q = q.filter(User.role.in_(["admin", "operator", "seller"]))
    elif role and role != "all":
        q = q.filter(User.role == role)

    if language:
        q = q.filter(User.language == language)

    if branch_id:
        q = q.filter(User.branch_id == branch_id)

    if min_orders and min_orders > 0:
        from app.models.models import Order
        subq = db.query(Order.customer_id, func.count(Order.id).label("cnt")).group_by(
            Order.customer_id
        ).having(func.count(Order.id) >= min_orders).subquery()
        q = q.join(subq, User.id == subq.c.customer_id)

    return q.all()


@router_bot.post("/broadcast")
async def broadcast(
    data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Pro broadcast: to'g'ridan-to'g'ri Telegram API orqali yuboradi.
    Bot process ishlamasa ham ishlaydi!
    """
    from app.services.telegram import create_job, run_broadcast

    text = (data.get("text") or "").strip()
    title = (data.get("title") or "").strip()
    role = data.get("role") or "customer"
    language = data.get("language") or ""
    branch_id = data.get("branch_id") or None
    min_orders = int(data.get("min_orders") or 0)
    photo_url = (data.get("photo_url") or "").strip() or None
    button_text = (data.get("button_text") or "").strip() or None
    button_url = (data.get("button_url") or "").strip() or None

    if not text:
        raise HTTPException(400, "Xabar matni bo'sh bo'lishi mumkin emas")

    users = _get_target_users(role, language, branch_id, min_orders, db)
    if not users:
        return {"ok": True, "job_id": None, "total": 0,
                "message": "Bu shartlarga mos telegram_id bor foydalanuvchilar yo'q"}

    full_text = f"<b>{title}</b>\n\n{text}" if title else text

    target_label = {"all": "Hammasi", "customer": "Mijozlar", "operator": "Operatorlar",
                    "seller": "Sotuvchilar", "staff": "Xodimlar"}.get(role, role)
    if language:
        target_label += f" ({language.upper()})"

    job_id = create_job(title or text[:40], full_text, target_label, len(users))

    user_dicts = [{"telegram_id": u.telegram_id, "full_name": u.full_name} for u in users]

    background_tasks.add_task(
        run_broadcast,
        job_id=job_id,
        users=user_dicts,
        text=full_text,
        photo_url=photo_url,
        button_text=button_text,
        button_url=button_url,
    )

    # Shuningdek eski notification queue ga ham qo'shamiz (bot worker uchun)
    for u in users:
        notif = Notification(user_id=u.id, title=title or "Mixart", body=text, is_sent=False, failed_count=0)
        db.add(notif)
    db.commit()

    return {
        "ok": True,
        "job_id": job_id,
        "total": len(users),
        "message": f"{len(users)} ta foydalanuvchiga yuborilmoqda..."
    }


@router_bot.get("/broadcast/progress/{job_id}")
def broadcast_progress(job_id: str):
    """Real-time broadcast progressi."""
    from app.services.telegram import get_job
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job topilmadi")
    return job


@router_bot.get("/broadcast/history")
def broadcast_history():
    """Broadcast tarixi."""
    from app.services.telegram import load_history
    history = load_history()
    return list(reversed(history))


@router_bot.get("/broadcast/audience")
def audience_preview(
    role: str = "customer",
    language: str = "",
    branch_id: int = None,
    min_orders: int = 0,
    db: Session = Depends(get_db)
):
    """Yuborish oldidan auditoriya hajmini ko'rish."""
    users = _get_target_users(role, language, branch_id, min_orders, db)
    tg_count = len([u for u in users if u.telegram_id])
    return {
        "total": tg_count,
        "sample": [{"full_name": u.full_name, "language": u.language} for u in users[:5]]
    }


@router_bot.post("/broadcast/test")
async def broadcast_test(data: dict, db: Session = Depends(get_db)):
    """Admin ga test xabar yuborish (1 ta)."""
    from app.services.telegram import _send_one
    text = data.get("text", "").strip()
    chat_id = data.get("chat_id", "").strip()
    photo_url = data.get("photo_url", "") or None
    button_text = data.get("button_text", "") or None
    button_url = data.get("button_url", "") or None

    if not text or not chat_id:
        raise HTTPException(400, "text va chat_id majburiy")

    async with httpx.AsyncClient() as client:
        ok, reason = await _send_one(client, chat_id, text, photo_url, button_text, button_url)

    return {"ok": ok, "reason": reason if not ok else ""}


@router_bot.get("/users-stats")
def bot_users_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func
    total = db.query(func.count(User.id)).filter(User.telegram_id != None).scalar() or 0
    by_role = {}
    for role in ["customer", "operator", "seller", "admin"]:
        by_role[role] = db.query(func.count(User.id)).filter(
            User.role == role, User.telegram_id != None
        ).scalar() or 0
    by_lang = {}
    for lang in ["uz", "ru", "en"]:
        by_lang[lang] = db.query(func.count(User.id)).filter(
            User.language == lang, User.telegram_id != None
        ).scalar() or 0
    return {"total": total, "by_role": by_role, "by_lang": by_lang}
