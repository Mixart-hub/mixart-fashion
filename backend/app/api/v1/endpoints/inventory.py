"""Filiallarga sklad boshqaruvi va statistika"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.db.database import get_db
from app.models.models import Stock, Product, Branch, Order, OrderItem
from datetime import datetime, timedelta

router = APIRouter()

# ── FILIAL BO'YICHA SKLAD ─────────────────────────────────────────────────
@router.get("/branch/{branch_id}/stocks")
def get_branch_stocks(branch_id: int, db: Session = Depends(get_db)):
    """Bitta filialdagi barcha sklad."""
    stocks = db.query(Stock).filter(Stock.branch_id == branch_id).all()
    result = []
    for s in stocks:
        p = s.product
        if not p: continue
        result.append({
            "id": s.id,
            "product_id": p.id,
            "product_name": p.name_uz,
            "product_image": p.images[0] if p.images else None,
            "size": s.size,
            "color": s.color,
            "quantity": s.quantity,
            "min_quantity": s.min_quantity,
            "low_stock": s.quantity <= s.min_quantity,
            "price": float(p.price),
            "value": float(p.price) * s.quantity
        })
    return result

@router.get("/product/{product_id}/branches")
def get_product_in_branches(product_id: int, db: Session = Depends(get_db)):
    """Mahsulot barcha filiallarda nechta turibdi."""
    rows = db.query(
        Branch.id, Branch.name,
        func.coalesce(func.sum(Stock.quantity), 0).label("total")
    ).outerjoin(
        Stock, and_(Stock.branch_id == Branch.id, Stock.product_id == product_id)
    ).group_by(Branch.id, Branch.name).all()

    detailed = db.query(Stock).filter(Stock.product_id == product_id).all()
    by_branch = {}
    for s in detailed:
        by_branch.setdefault(s.branch_id, []).append({
            "size": s.size, "color": s.color, "quantity": s.quantity,
            "min_quantity": s.min_quantity, "stock_id": s.id
        })

    return [{
        "branch_id": r[0],
        "branch_name": r[1],
        "total_quantity": int(r[2]),
        "items": by_branch.get(r[0], [])
    } for r in rows]

@router.put("/branch/{branch_id}/stock")
def update_branch_stock(
    branch_id: int,
    product_id: int = Query(...),
    size: str = Query(...),
    color: str = Query(...),
    quantity: int = Query(...),
    min_quantity: int = Query(3),
    db: Session = Depends(get_db)
):
    """Filialda sklad miqdorini yangilash yoki yaratish."""
    if not db.query(Branch).filter(Branch.id == branch_id).first():
        raise HTTPException(404, "Filial topilmadi")
    if not db.query(Product).filter(Product.id == product_id).first():
        raise HTTPException(404, "Mahsulot topilmadi")

    stock = db.query(Stock).filter(
        Stock.product_id == product_id,
        Stock.size == size,
        Stock.color == color,
        Stock.branch_id == branch_id
    ).first()

    if stock:
        stock.quantity = quantity
        stock.min_quantity = min_quantity
    else:
        stock = Stock(
            product_id=product_id,
            branch_id=branch_id,
            size=size, color=color,
            quantity=quantity, min_quantity=min_quantity
        )
        db.add(stock)
    db.commit()
    return {"ok": True, "stock_id": stock.id}

@router.delete("/stock/{stock_id}")
def delete_stock(stock_id: int, db: Session = Depends(get_db)):
    s = db.query(Stock).filter(Stock.id == stock_id).first()
    if s:
        db.delete(s); db.commit()
    return {"ok": True}

# ── FILIAL STATISTIKA ─────────────────────────────────────────────────────
@router.get("/branches/stats")
def all_branches_stats(db: Session = Depends(get_db)):
    """Barcha filiallar bo'yicha umumiy statistika."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    month_ago = today - timedelta(days=30)
    
    branches = db.query(Branch).filter(Branch.is_active == True).all()
    result = []
    for b in branches:
        # Sklad
        stock_data = db.query(
            func.count(Stock.id),
            func.coalesce(func.sum(Stock.quantity), 0)
        ).filter(Stock.branch_id == b.id).first()
        
        # Sklad qiymati
        value = db.query(
            func.coalesce(func.sum(Stock.quantity * Product.price), 0)
        ).join(Product, Product.id == Stock.product_id).filter(
            Stock.branch_id == b.id
        ).scalar() or 0

        # Kam qolgan
        low = db.query(func.count(Stock.id)).filter(
            Stock.branch_id == b.id,
            Stock.quantity <= Stock.min_quantity
        ).scalar() or 0

        result.append({
            "branch_id": b.id,
            "branch_name": b.name,
            "address": b.address,
            "stock_items": stock_data[0] or 0,
            "total_quantity": int(stock_data[1] or 0),
            "stock_value": round(float(value), 2),
            "low_stock_count": int(low)
        })
    return result

@router.get("/branches/{branch_id}/sales-chart")
def branch_sales_chart(branch_id: int, days: int = 30, db: Session = Depends(get_db)):
    """Filial uchun kunlik sotuvlar grafigi."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    start = today - timedelta(days=days)
    
    rows = db.query(
        func.date(Order.created_at).label("day"),
        func.count(Order.id),
        func.coalesce(func.sum(Order.final_amount), 0)
    ).filter(
        Order.branch_id == branch_id,
        Order.created_at >= start,
        Order.status.in_(["delivered", "shipped", "processing"])
    ).group_by(func.date(Order.created_at)).all()

    # Bo'sh kunlarni to'ldirish
    data = {}
    for r in rows:
        data[str(r[0])] = {"orders": int(r[1]), "revenue": float(r[2])}
    
    chart = []
    for i in range(days):
        d = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        item = data.get(d, {"orders": 0, "revenue": 0})
        chart.append({
            "date": d,
            "label": (start + timedelta(days=i)).strftime("%d.%m"),
            "orders": item["orders"],
            "revenue": round(item["revenue"], 2)
        })
    return chart

@router.get("/dashboard/charts")
def dashboard_charts(period: str = "month", db: Session = Depends(get_db)):
    """
    Dashboard grafiklar.
    period: "today", "week", "month"
    """
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Period bo'yicha kun va guruhlash
    if period == "today":
        days_count = 1
        group_by = "hour"  # soatlar bo'yicha
    elif period == "week":
        days_count = 7
        group_by = "day"
    else:  # month
        days_count = 30
        group_by = "day"

    period_start = today - timedelta(days=days_count - 1)

    # 1. Vaqtli grafik
    daily = []
    if group_by == "hour":
        # Bugungi soatlar
        for h in range(24):
            d_start = today + timedelta(hours=h)
            d_end = d_start + timedelta(hours=1)
            sales = db.query(
                func.count(Order.id),
                func.coalesce(func.sum(Order.final_amount), 0)
            ).filter(
                Order.created_at >= d_start,
                Order.created_at < d_end,
                Order.status.in_(["delivered", "shipped", "processing", "new"])
            ).first()
            daily.append({
                "label": f"{h:02d}:00",
                "orders": int(sales[0] or 0),
                "revenue": round(float(sales[1] or 0), 2)
            })
    else:
        for i in range(days_count):
            d = period_start + timedelta(days=i)
            d_end = d + timedelta(days=1)
            sales = db.query(
                func.count(Order.id),
                func.coalesce(func.sum(Order.final_amount), 0)
            ).filter(
                Order.created_at >= d,
                Order.created_at < d_end,
                Order.status.in_(["delivered", "shipped", "processing", "new"])
            ).first()
            daily.append({
                "label": d.strftime("%d.%m"),
                "orders": int(sales[0] or 0),
                "revenue": round(float(sales[1] or 0), 2)
            })

    # 2. Filiallar bo'yicha (alohida grafik uchun ham)
    by_branch = db.query(
        Branch.id, Branch.name, Branch.address,
        func.count(Order.id),
        func.coalesce(func.sum(Order.final_amount), 0)
    ).outerjoin(
        Order, and_(
            Order.branch_id == Branch.id,
            Order.created_at >= period_start,
            Order.status.in_(["delivered", "shipped", "processing", "new"])
        )
    ).filter(Branch.is_active == True).group_by(Branch.id, Branch.name, Branch.address).all()

    branch_chart = [{
        "branch_id": r[0],
        "name": r[1],
        "address": r[2],
        "orders": int(r[3] or 0),
        "revenue": round(float(r[4] or 0), 2)
    } for r in by_branch]

    # 3. Har filial uchun alohida vaqt grafigi
    branch_charts = []
    for b in branch_chart:
        bid = b["branch_id"]
        chart = []
        if group_by == "hour":
            for h in range(24):
                d_start = today + timedelta(hours=h)
                d_end = d_start + timedelta(hours=1)
                rev = db.query(
                    func.coalesce(func.sum(Order.final_amount), 0)
                ).filter(
                    Order.branch_id == bid,
                    Order.created_at >= d_start,
                    Order.created_at < d_end,
                    Order.status.in_(["delivered", "shipped", "processing", "new"])
                ).scalar() or 0
                chart.append({"label": f"{h:02d}:00", "revenue": round(float(rev), 2)})
        else:
            for i in range(days_count):
                d = period_start + timedelta(days=i)
                d_end = d + timedelta(days=1)
                rev = db.query(
                    func.coalesce(func.sum(Order.final_amount), 0)
                ).filter(
                    Order.branch_id == bid,
                    Order.created_at >= d,
                    Order.created_at < d_end,
                    Order.status.in_(["delivered", "shipped", "processing", "new"])
                ).scalar() or 0
                chart.append({"label": d.strftime("%d.%m"), "revenue": round(float(rev), 2)})
        branch_charts.append({
            "branch_id": bid,
            "name": b["name"],
            "address": b["address"],
            "total_orders": b["orders"],
            "total_revenue": b["revenue"],
            "chart": chart
        })

    # 4. Top mahsulotlar
    top_products = db.query(
        Product.name_uz,
        func.sum(OrderItem.quantity).label("sold")
    ).join(OrderItem, OrderItem.product_id == Product.id).join(
        Order, Order.id == OrderItem.order_id
    ).filter(
        Order.created_at >= period_start,
        Order.status.in_(["delivered", "shipped"])
    ).group_by(Product.id, Product.name_uz).order_by(
        func.sum(OrderItem.quantity).desc()
    ).limit(7).all()

    top_chart = [{"name": r[0], "sold": int(r[1])} for r in top_products]

    # 5. Buyurtma holatlari
    statuses = ["new", "processing", "shipped", "delivered", "cancelled", "returned"]
    status_chart = []
    for st in statuses:
        cnt = db.query(func.count(Order.id)).filter(
            Order.status == st,
            Order.created_at >= period_start
        ).scalar() or 0
        status_chart.append({"status": st, "count": int(cnt)})

    return {
        "period": period,
        "daily_sales": daily,
        "by_branch": branch_chart,
        "branch_charts": branch_charts,
        "top_products": top_chart,
        "by_status": status_chart
    }
