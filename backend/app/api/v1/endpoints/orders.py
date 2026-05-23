from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, date
from app.db.database import get_db
from app.models.models import Order, OrderItem, OrderStatus, Cart, CartItem, Stock, LoyaltyAccount, PromoCode, Product

router = APIRouter()

def calc_loyalty_discount(loyalty, amount):
    if not loyalty: return 0
    if loyalty.level == "gold": return amount * 0.10
    if loyalty.level == "silver": return amount * 0.05
    return 0

@router.post("/")
def create_order(data: dict, db: Session = Depends(get_db)):
    discount = 0
    if data.get("promo_code"):
        promo = db.query(PromoCode).filter(
            PromoCode.code == data["promo_code"],
            PromoCode.is_active == True
        ).first()
        if promo and promo.used_count < promo.max_uses:
            if not promo.valid_until or promo.valid_until > datetime.utcnow():
                discount += data["total_amount"] * (promo.discount_percent / 100)
                promo.used_count += 1

    loyalty = db.query(LoyaltyAccount).filter(LoyaltyAccount.user_id == data["customer_id"]).first()
    discount += calc_loyalty_discount(loyalty, data["total_amount"])

    final = data["total_amount"] - discount + data.get("delivery_amount", 5)

    order = Order(
        customer_id=data["customer_id"],
        branch_id=data.get("branch_id"),
        total_amount=data["total_amount"],
        discount_amount=round(discount, 2),
        delivery_amount=data.get("delivery_amount", 5),
        final_amount=round(final, 2),
        delivery_address=data.get("delivery_address"),
        delivery_lat=data.get("delivery_lat"),
        delivery_lon=data.get("delivery_lon"),
        payment_method=data.get("payment_method"),
        note=data.get("note"),
        promo_code=data.get("promo_code")
    )
    db.add(order)
    db.flush()

    for item in data["items"]:
        stock = db.query(Stock).filter(
            Stock.product_id == item["product_id"],
            Stock.size == item["size"],
            Stock.color == item["color"]
        ).first()
        if not stock or stock.quantity < item["quantity"]:
            db.rollback()
            raise HTTPException(400, f"Mahsulot {item['product_id']} yetarli emas")
        stock.quantity -= item["quantity"]
        db.add(OrderItem(
            order_id=order.id,
            product_id=item["product_id"],
            size=item["size"],
            color=item["color"],
            quantity=item["quantity"],
            price=item["price"]
        ))
        p = db.query(Product).filter(Product.id == item["product_id"]).first()
        if p: p.sales_count += item["quantity"]

    if loyalty:
        loyalty.points += int(data["total_amount"] * 10)
        loyalty.total_spent += data["total_amount"]
        if loyalty.total_spent >= 500: loyalty.level = "gold"
        elif loyalty.total_spent >= 150: loyalty.level = "silver"

    cart = db.query(Cart).filter(Cart.user_id == data["customer_id"]).first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()

    db.commit()
    db.refresh(order)
    return _order_to_dict(order)

def _order_to_dict(o, customer=None, branch=None, items=None):
    """Order ni dict ga aylantirish (customer_name, branch_name bilan)."""
    try:
        cust_name = (customer.full_name if customer else None) or (o.customer.full_name if o.customer else "—")
        cust_phone = (customer.phone if customer else None) or (o.customer.phone if o.customer else None)
    except Exception:
        cust_name = "—"
        cust_phone = None
    try:
        branch_name = (branch.name if branch else None) or (o.branch.name if o.branch else "Belgilanmagan")
    except Exception:
        branch_name = "Belgilanmagan"
    return {
        "id": o.id,
        "customer_id": o.customer_id,
        "customer_name": cust_name,
        "customer_phone": cust_phone,
        "branch_id": o.branch_id,
        "branch_name": branch_name,
        "operator_id": o.operator_id,
        "delivery_address": o.delivery_address,
        "note": o.note,
        "payment_method": o.payment_method.value if hasattr(o.payment_method, "value") else o.payment_method,
        "payment_status": o.payment_status.value if hasattr(o.payment_status, "value") else o.payment_status,
        "status": o.status.value if hasattr(o.status, "value") else o.status,
        "total_amount": float(o.total_amount) if o.total_amount else 0,
        "discount_amount": float(o.discount_amount) if o.discount_amount else 0,
        "delivery_amount": float(o.delivery_amount) if o.delivery_amount else 0,
        "final_amount": float(o.final_amount) if o.final_amount else 0,
        "created_at": o.created_at,
        "items": items if items is not None else [],
    }

@router.get("/")
def list_orders(
    status: Optional[str] = None,
    branch_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db)
):
    q = db.query(Order)
    if status: q = q.filter(Order.status == status)
    if branch_id: q = q.filter(Order.branch_id == branch_id)
    if customer_id: q = q.filter(Order.customer_id == customer_id)
    if date_from: q = q.filter(Order.created_at >= date_from)
    if date_to: q = q.filter(Order.created_at <= date_to)
    total = q.count()
    orders = q.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()

    # Customer va Branch nomlarini olish
    items = [_order_to_dict(o) for o in orders]
    return {"total": total, "items": items}

@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    """Dashboard statistikasi - barcha asosiy metriklar."""
    from app.models.models import User, Product
    today = date.today()
    month_start = today.replace(day=1)

    # Daromad - barcha buyurtmalar (paid bo'lmasada hisoblanadi - to'liq bizz daromad)
    sold_statuses = ["delivered", "shipped", "processing"]

    daily_rev = db.query(func.coalesce(func.sum(Order.final_amount), 0)).filter(
        func.date(Order.created_at) == today,
        Order.status.in_(sold_statuses)
    ).scalar() or 0

    monthly_rev = db.query(func.coalesce(func.sum(Order.final_amount), 0)).filter(
        Order.created_at >= month_start,
        Order.status.in_(sold_statuses)
    ).scalar() or 0

    # Mijozlar soni - bitta filtr (boshqa joyda ham shu filtr ishlatiladi)
    customers_total = db.query(func.count(User.id)).filter(
        User.role == "customer",
        User.is_active == True,
        User.telegram_id != None  # faqat botdan ro'yxatdan o'tganlar
    ).scalar() or 0

    # Mahsulotlar
    products_total = db.query(func.count(Product.id)).filter(
        Product.is_active == True
    ).scalar() or 0

    return {
        "daily_revenue": float(daily_rev),
        "monthly_revenue": float(monthly_rev),
        "daily_orders": db.query(func.count(Order.id)).filter(func.date(Order.created_at) == today).scalar() or 0,
        "monthly_orders": db.query(func.count(Order.id)).filter(Order.created_at >= month_start).scalar() or 0,
        "new_orders": db.query(func.count(Order.id)).filter(Order.status == "new").scalar() or 0,
        "processing": db.query(func.count(Order.id)).filter(Order.status == "processing").scalar() or 0,
        "customers_total": int(customers_total),
        "products_total": int(products_total),
    }

@router.get("/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db)):
    from app.models.models import OrderItem, Product
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o: raise HTTPException(404, "Buyurtma topilmadi")

    # Order itemlarini olish
    items_data = []
    for item in db.query(OrderItem).filter(OrderItem.order_id == order_id).all():
        prod = db.query(Product).filter(Product.id == item.product_id).first()
        items_data.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": prod.name_uz if prod else "—",
            "size": item.size,
            "color": item.color,
            "quantity": item.quantity,
            "unit_price": float(item.price),
            "subtotal": float(item.price) * item.quantity,
        })

    return _order_to_dict(o, items=items_data)

@router.patch("/{order_id}/status")
def update_status(
    order_id: int, new_status: str,
    background_tasks: BackgroundTasks,
    operator_id: int = None,
    db: Session = Depends(get_db)
):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o: raise HTTPException(404, "Topilmadi")
    try:
        o.status = OrderStatus(new_status)
    except ValueError:
        raise HTTPException(400, "Noto'g'ri status")
    if operator_id: o.operator_id = operator_id
    db.commit()

    # SMS + Email notification background da
    if background_tasks and o.customer:
        cust = o.customer
        amount = float(o.final_amount or 0)
        lang = cust.language or "uz"
        if cust.phone:
            background_tasks.add_task(_notify_sms, cust.phone, order_id, new_status, amount, lang)
        if cust.email:
            background_tasks.add_task(_notify_email, cust.email, order_id, new_status, amount, lang)

    return {"ok": True, "order_id": order_id, "status": new_status}


async def _notify_sms(phone, order_id, status, amount, lang):
    try:
        from app.services.sms import send_order_sms
        await send_order_sms(phone, order_id, status, amount, lang)
    except Exception as e:
        import logging; logging.getLogger(__name__).warning(f"SMS xato: {e}")


async def _notify_email(email, order_id, status, amount, lang):
    try:
        from app.services.email_service import send_order_email
        await send_order_email(email, order_id, status, amount, lang)
    except Exception as e:
        import logging; logging.getLogger(__name__).warning(f"Email xato: {e}")

@router.patch("/{order_id}/payment")
def confirm_payment(order_id: int, transaction_id: str, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o: raise HTTPException(404, "Topilmadi")
    o.payment_status = "paid"
    o.payment_transaction_id = transaction_id
    db.commit()
    return {"ok": True}
