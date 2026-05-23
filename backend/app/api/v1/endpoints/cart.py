from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Cart, CartItem, Product, Stock

router = APIRouter()

def _get_or_create_cart(user_id: int, db: Session):
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart); db.flush()
    return cart

@router.get("/{user_id}")
def get_cart(user_id: int, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        return {"user_id": user_id, "items": [], "total": 0, "item_count": 0}
    items, total = [], 0
    for item in cart.items:
        p = item.product
        if not p: continue
        subtotal = float(p.price) * item.quantity
        total += subtotal
        items.append({
            "id": item.id,
            "product": {
                "id": p.id,
                "name_uz": p.name_uz,
                "name_ru": p.name_ru,
                "price": float(p.price),
                "old_price": float(p.old_price) if p.old_price else None,
                "images": p.images or [],
            },
            "size": item.size,
            "color": item.color,
            "quantity": item.quantity,
            "subtotal": round(subtotal, 2)
        })
    return {"user_id": user_id, "items": items, "total": round(total, 2), "item_count": len(items)}

@router.post("/{user_id}/add")
def add_to_cart(
    user_id: int, product_id: int, size: str, color: str,
    quantity: int = 1, db: Session = Depends(get_db)
):
    # Mahsulot mavjudligini tekshirish
    product = db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(404, "Mahsulot topilmadi")

    # Sklad tekshiruvi (agar sklad yozuvi bo'lsa)
    stock = db.query(Stock).filter(
        Stock.product_id == product_id,
        Stock.size == size,
        Stock.color == color
    ).first()
    if stock and stock.quantity < quantity:
        raise HTTPException(400, f"Faqat {stock.quantity} ta qoldi")

    cart = _get_or_create_cart(user_id, db)

    existing = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.product_id == product_id,
        CartItem.size == size,
        CartItem.color == color
    ).first()

    if existing:
        existing.quantity += quantity
    else:
        db.add(CartItem(
            cart_id=cart.id,
            product_id=product_id,
            size=size, color=color,
            quantity=quantity
        ))
    db.commit()
    return {"ok": True, "message": "Savatga qo'shildi"}

@router.patch("/{user_id}/item/{item_id}")
def update_cart_item(user_id: int, item_id: int, quantity: int, db: Session = Depends(get_db)):
    item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Topilmadi")
    if quantity <= 0:
        db.delete(item)
    else:
        item.quantity = quantity
    db.commit()
    return {"ok": True}

@router.delete("/{user_id}/item/{item_id}")
def remove_cart_item(user_id: int, item_id: int, db: Session = Depends(get_db)):
    item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if item:
        db.delete(item); db.commit()
    return {"ok": True}

@router.delete("/{user_id}/clear")
def clear_cart(user_id: int, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()
    return {"ok": True}
