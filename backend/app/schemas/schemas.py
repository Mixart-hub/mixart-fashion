from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ─── AUTH ────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class GoogleAuthIn(BaseModel):
    credential: str

class UserCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    telegram_id: Optional[str] = None
    password: Optional[str] = None
    language: str = "uz"
    referral_code: Optional[str] = None

class UserOut(BaseModel):
    id: int
    full_name: str
    phone: Optional[str]
    email: Optional[str] = None
    telegram_id: Optional[str]
    role: str
    language: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

# ─── PRODUCT ─────────────────────────────────────────────
class ProductCreate(BaseModel):
    name_uz: str
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    description_uz: Optional[str] = None
    price: float
    old_price: Optional[float] = None
    category_id: int
    images: List[str] = []
    sizes: List[str] = []
    colors: List[str] = []
    material: Optional[str] = None
    care_instructions: Optional[str] = None

class ProductOut(BaseModel):
    id: int
    name_uz: str
    name_ru: Optional[str]
    price: float
    old_price: Optional[float]
    images: List[str]
    sizes: List[str]
    colors: List[str]
    is_trending: bool
    views_count: int
    sales_count: int
    class Config:
        from_attributes = True

class StockOut(BaseModel):
    id: int
    size: str
    color: str
    quantity: int
    min_quantity: int
    class Config:
        from_attributes = True

# ─── ORDER ───────────────────────────────────────────────
class OrderItemCreate(BaseModel):
    product_id: int
    size: str
    color: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    customer_id: int
    branch_id: Optional[int] = None
    items: List[OrderItemCreate]
    total_amount: float
    delivery_amount: float = 5.0
    delivery_address: Optional[str] = None
    delivery_lat: Optional[float] = None
    delivery_lon: Optional[float] = None
    payment_method: Optional[str] = None
    note: Optional[str] = None
    promo_code: Optional[str] = None

class OrderOut(BaseModel):
    id: int
    status: str
    total_amount: float
    discount_amount: float
    final_amount: float
    payment_status: str
    created_at: datetime
    class Config:
        from_attributes = True

# ─── CART ────────────────────────────────────────────────
class CartItemCreate(BaseModel):
    product_id: int
    size: str
    color: str
    quantity: int = 1

# ─── LOYALTY ─────────────────────────────────────────────
class LoyaltyOut(BaseModel):
    points: int
    level: str
    total_spent: float
    referral_code: str
    class Config:
        from_attributes = True

# ─── STATS ───────────────────────────────────────────────
class DashboardStats(BaseModel):
    daily_revenue: float
    monthly_revenue: float
    daily_orders: int
    monthly_orders: int
    new_orders: int
    active_customers: int
    low_stock_count: int
