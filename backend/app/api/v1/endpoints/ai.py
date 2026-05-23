"""
MIX AI - Backend endpointlari
Admin panel, TWA va Bot AI bilan ishlash uchun.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timedelta
import json
import logging

from app.db.database import get_db
from app.models.models import (
    Product, Order, OrderItem, User, Branch, Stock,
    Category, Notification
)
from app.services.ai import mix_ai

router = APIRouter()
log = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════
# 1. AI CHAT - Admin va Mijoz uchun
# ═══════════════════════════════════════════════════════════
@router.post("/chat")
async def ai_chat(data: dict, db: Session = Depends(get_db)):
    """
    Mix bilan suhbat.
    
    Body: {
        "message": "Salom Mix",
        "user_id": "123",
        "role": "admin" | "customer"
    }
    """
    message = (data.get("message") or "").strip()
    user_id = str(data.get("user_id", "default"))
    role = data.get("role", "customer")
    
    if not message:
        raise HTTPException(400, "Xabar bo'sh")
    
    # Kontekst - real ma'lumotlarni qo'shish
    context = await build_context(role, user_id, db)
    
    full_message = message
    if context:
        full_message = f"{message}\n\n[Kontekst (foydalanuvchi ko'rmaydi):\n{context}]"
    
    result = await mix_ai.chat(
        message=full_message,
        user_id=user_id,
        user_role=role
    )
    
    return {
        "text": result["text"],
        "session_id": result.get("session_id"),
        "error": result.get("error"),
    }


async def build_context(role: str, user_id: str, db: Session) -> str:
    """Mix uchun real biznes ma'lumotlari."""
    parts = []
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    if role == "admin":
        # Bugungi sotuv
        today_sales = db.query(func.coalesce(func.sum(Order.final_amount), 0)).filter(
            Order.created_at >= today,
            Order.status.in_(["delivered", "shipped", "processing"])
        ).scalar() or 0
        
        today_orders = db.query(func.count(Order.id)).filter(
            Order.created_at >= today
        ).scalar() or 0
        
        # Kam qolgan
        low_stock = db.query(func.count(Stock.id)).filter(
            Stock.quantity <= Stock.min_quantity
        ).scalar() or 0
        
        # Yangi buyurtmalar
        new_orders = db.query(func.count(Order.id)).filter(
            Order.status == "new"
        ).scalar() or 0
        
        # Mijozlar
        customers = db.query(func.count(User.id)).filter(
            User.role == "customer",
            User.is_active == True
        ).scalar() or 0
        
        parts.append(f"Bugun: {today.strftime('%d.%m.%Y')}")
        parts.append(f"Bugungi sotuv: {int(today_sales):,} so'm")
        parts.append(f"Bugungi buyurtmalar: {today_orders} ta")
        parts.append(f"Yangi (qabul kutyotgan): {new_orders} ta")
        parts.append(f"Kam qolgan mahsulotlar: {low_stock} ta")
        parts.append(f"Jami mijozlar: {customers} ta")
        
        # Filiallar
        branches = db.query(Branch).filter(Branch.is_active == True).all()
        parts.append(f"Filiallar: {', '.join(b.name for b in branches)}")
    
    elif role == "customer":
        # Mahsulotlar haqida qisqa ma'lumot
        total_products = db.query(func.count(Product.id)).filter(
            Product.is_active == True
        ).scalar() or 0
        
        categories = db.query(Category).all()
        cat_names = [c.name_uz for c in categories]
        
        parts.append(f"Bizda jami {total_products} ta mahsulot bor")
        parts.append(f"Kategoriyalar: {', '.join(cat_names)}")
        parts.append("Yetkazib berish: Toshkent ichida BEPUL, 1-2 kun")
        parts.append("Ish vaqti: 09:00-21:00, bot 24/7")
    
    return "\n".join(parts)


# ═══════════════════════════════════════════════════════════
# 2. RASMDAN MAHSULOT TAVSIFI YARATISH
# ═══════════════════════════════════════════════════════════
@router.post("/analyze-product-image")
async def analyze_product_image(file: UploadFile = File(...)):
    """
    Mahsulot rasmini AI tahlili - tavsif, narx, kategoriya tavsiya.
    """
    image_data = await file.read()
    
    if not image_data:
        raise HTTPException(400, "Rasm bo'sh")
    
    if len(image_data) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(400, "Rasm juda katta (max 5MB)")
    
    try:
        raw_response = await mix_ai.analyze_image(image_data)
        
        # JSON parse qilish
        # Gemini ba'zan ```json ... ``` bilan o'rab beradi
        clean = raw_response.replace("```json", "").replace("```", "").strip()
        
        try:
            parsed = json.loads(clean)
            return {
                "success": True,
                "data": parsed,
                "raw": raw_response,
            }
        except json.JSONDecodeError:
            return {
                "success": False,
                "data": {
                    "description": clean,
                    "name": "",
                    "color": "",
                    "category": "",
                    "suggested_price": 0,
                },
                "raw": raw_response,
            }
    
    except Exception as e:
        log.error(f"Image analysis error: {e}")
        raise HTTPException(500, f"Tahlil xato: {e}")


# ═══════════════════════════════════════════════════════════
# 3. OVOZNI MATNGA AYLANTIRISH
# ═══════════════════════════════════════════════════════════
@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Ovozli faylni matnga aylantirish."""
    audio_data = await file.read()
    
    if not audio_data:
        raise HTTPException(400, "Audio bo'sh")

    if len(audio_data) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(400, "Audio juda katta (max 10MB)")

    mime_type = file.content_type or "audio/ogg"
    text = await mix_ai.transcribe_audio(audio_data, mime_type)
    
    return {
        "text": text,
        "success": bool(text),
    }


# ═══════════════════════════════════════════════════════════
# 4. AI TAVSIYALAR (Dashboard widget)
# ═══════════════════════════════════════════════════════════
@router.get("/admin/suggestions")
async def admin_suggestions(db: Session = Depends(get_db)):
    """Admin uchun avto tavsiyalar (Mix sezadi)."""
    suggestions = []
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 1. Kam qolgan mahsulotlar
    low_stocks = db.query(Stock, Product).join(Product, Product.id == Stock.product_id).filter(
        Stock.quantity <= Stock.min_quantity,
        Stock.quantity > 0,
        Product.is_active == True
    ).limit(3).all()
    
    for stock, product in low_stocks:
        suggestions.append({
            "type": "warning",
            "icon": "⚠️",
            "title": "Sklad kam",
            "description": f"{product.name_uz} ({stock.size}, {stock.color}) faqat {stock.quantity} ta qoldi",
            "action": "transfer_stock",
            "data": {"product_id": product.id}
        })
    
    # 2. Tugagan mahsulotlar
    out_of_stock = db.query(Product).filter(
        Product.is_active == True,
        ~Product.stocks.any(Stock.quantity > 0)
    ).limit(2).all()
    
    for p in out_of_stock:
        suggestions.append({
            "type": "error",
            "icon": "🚨",
            "title": "Tugagan mahsulot",
            "description": f"{p.name_uz} - sklad to'liq tugagan! Buyurtma bering",
            "action": "reorder",
            "data": {"product_id": p.id}
        })
    
    # 3. Yangi buyurtmalar
    new_count = db.query(func.count(Order.id)).filter(
        Order.status == "new"
    ).scalar() or 0
    
    if new_count >= 3:
        suggestions.append({
            "type": "info",
            "icon": "🆕",
            "title": "Yangi buyurtmalar",
            "description": f"{new_count} ta yangi buyurtma qabul qilishni kutmoqda!",
            "action": "view_orders",
        })
    
    # 4. Sotuv pasaygan kun (oxirgi 3 kun o'rtachadan past)
    yesterday = today - timedelta(days=1)
    yesterday_sales = db.query(func.coalesce(func.sum(Order.final_amount), 0)).filter(
        Order.created_at >= yesterday,
        Order.created_at < today,
        Order.status.in_(["delivered", "shipped"])
    ).scalar() or 0
    
    week_ago = today - timedelta(days=7)
    avg_sales = db.query(func.coalesce(func.avg(Order.final_amount), 0)).filter(
        Order.created_at >= week_ago,
        Order.created_at < today,
        Order.status.in_(["delivered", "shipped"])
    ).scalar() or 0
    
    if avg_sales and yesterday_sales < avg_sales * 0.7:
        suggestions.append({
            "type": "warning",
            "icon": "📉",
            "title": "Sotuv pasaygan",
            "description": f"Kechagi sotuv {int(yesterday_sales):,} so'm - haftalik o'rtachadan past. Promo yarataymizmi?",
            "action": "create_promo",
        })
    
    # 5. Sodiq mijoz qaytarish
    month_ago = today - timedelta(days=30)
    inactive_loyal = db.query(User, func.count(Order.id).label("order_count")).join(
        Order, Order.customer_id == User.id
    ).filter(
        User.role == "customer",
        User.is_active == True,
        User.telegram_id != None,
    ).group_by(User.id).having(
        func.count(Order.id) >= 3,
        func.max(Order.created_at) < month_ago
    ).limit(2).all()
    
    for user, count in inactive_loyal:
        suggestions.append({
            "type": "info",
            "icon": "💔",
            "title": "Sodiq mijoz qaytarish",
            "description": f"{user.full_name} {count} marta xarid qilgan, lekin oxirgi oy kelmadi. Promo yuboraymi?",
            "action": "send_back_promo",
            "data": {"user_id": user.id}
        })
    
    return {"suggestions": suggestions}


# ═══════════════════════════════════════════════════════════
# 5. ADMIN ERTANGI XULOSA
# ═══════════════════════════════════════════════════════════
@router.get("/admin/morning-brief")
async def morning_brief(db: Session = Depends(get_db)):
    """Ertangi avto xulosa (har kuni 09:00 da yuboriladi)."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    
    # Kechagi statistika
    yesterday_sales = db.query(func.coalesce(func.sum(Order.final_amount), 0)).filter(
        Order.created_at >= yesterday,
        Order.created_at < today,
        Order.status.in_(["delivered", "shipped"])
    ).scalar() or 0
    
    yesterday_orders = db.query(func.count(Order.id)).filter(
        Order.created_at >= yesterday,
        Order.created_at < today
    ).scalar() or 0
    
    # Top mahsulot
    top = db.query(Product.name_uz, func.sum(OrderItem.quantity).label("sold")).join(
        OrderItem, OrderItem.product_id == Product.id
    ).join(Order, Order.id == OrderItem.order_id).filter(
        Order.created_at >= yesterday,
        Order.created_at < today
    ).group_by(Product.id, Product.name_uz).order_by(
        func.sum(OrderItem.quantity).desc()
    ).first()
    
    top_product = top[0] if top else "Yo'q"
    
    # Yangi mijozlar
    new_customers = db.query(func.count(User.id)).filter(
        User.created_at >= yesterday,
        User.created_at < today,
        User.role == "customer"
    ).scalar() or 0
    
    # Kam qolgan
    low_stock_count = db.query(func.count(Stock.id)).filter(
        Stock.quantity <= Stock.min_quantity
    ).scalar() or 0
    
    stats = {
        "yesterday_sales": int(yesterday_sales),
        "yesterday_orders": yesterday_orders,
        "new_customers": new_customers,
        "top_product": top_product,
        "low_stock_count": low_stock_count,
        "today_day": today.strftime("%A, %d.%m.%Y"),
    }
    
    # Mix dan xulosa
    brief_text = await mix_ai.daily_morning_brief(stats)
    
    return {
        "stats": stats,
        "message": brief_text,
    }


# ═══════════════════════════════════════════════════════════
# 6. SESSIYANI TOZALASH
# ═══════════════════════════════════════════════════════════
@router.post("/clear-session")
async def clear_session(data: dict):
    """Mix bilan suhbat tarixini tozalash."""
    user_id = str(data.get("user_id", "default"))
    role = data.get("role", "customer")
    mix_ai.clear_session(user_id, role)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════
# 7. AI HOLATINI TEKSHIRISH
# ═══════════════════════════════════════════════════════════
@router.get("/status")
async def ai_status():
    """AI ishlayaptimi tekshirish."""
    import os
    has_key = bool(os.getenv("GEMINI_API_KEY"))
    
    return {
        "ai_enabled": has_key,
        "model": "gemini-2.5-flash-lite" if has_key else None,
        "features": {
            "chat": has_key,
            "vision": has_key,
            "audio": has_key,
            "function_calling": has_key,
        }
    }
