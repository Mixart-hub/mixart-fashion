from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    SELLER = "seller"
    CUSTOMER = "customer"

class OrderStatus(str, enum.Enum):
    NEW = "new"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"

class LoyaltyLevel(str, enum.Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"

class PaymentMethod(str, enum.Enum):
    CLICK = "click"
    PAYME = "payme"
    UZUM = "uzum"
    CASH = "cash"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

# ─── USER ────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(String(50), unique=True, index=True, nullable=True)
    full_name = Column(String(200), nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    email = Column(String(200), unique=True, nullable=True, index=True)
    google_id = Column(String(100), unique=True, nullable=True, index=True)
    password_hash = Column(String(200), nullable=True)
    language = Column(String(5), default="uz")
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    branch = relationship("Branch", back_populates="users")
    orders = relationship("Order", back_populates="customer", foreign_keys="Order.customer_id")
    loyalty = relationship("LoyaltyAccount", back_populates="user", uselist=False, foreign_keys="LoyaltyAccount.user_id")
    cart = relationship("Cart", back_populates="user", uselist=False)
    reviews = relationship("Review", back_populates="user")
    favorites = relationship("Favorite", back_populates="user")

# ─── BRANCH ──────────────────────────────────────────────
class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    address = Column(String(500))
    phone = Column(String(20))
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="branch")
    orders = relationship("Order", back_populates="branch")

# ─── CATEGORY ────────────────────────────────────────────
class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True)
    name_uz = Column(String(200), nullable=False)
    name_ru = Column(String(200))
    name_en = Column(String(200))
    emoji = Column(String(10), default="👗")
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    products = relationship("Product", back_populates="category")
    children = relationship("Category", backref="parent", remote_side=[id])

# ─── PRODUCT ─────────────────────────────────────────────
class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name_uz = Column(String(300), nullable=False)
    name_ru = Column(String(300))
    name_en = Column(String(300))
    description_uz = Column(Text)
    description_ru = Column(Text)
    price = Column(Float, nullable=False)
    old_price = Column(Float, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    images = Column(JSON, default=[])
    sizes = Column(JSON, default=[])
    colors = Column(JSON, default=[])
    material = Column(String(200))
    care_instructions = Column(Text)
    is_active = Column(Boolean, default=True)
    is_trending = Column(Boolean, default=False)
    is_new_arrival = Column(Boolean, default=False)
    views_count = Column(Integer, default=0)
    sales_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("Category", back_populates="products")
    stocks = relationship("Stock", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")
    favorites = relationship("Favorite", back_populates="product")

# ─── STOCK ───────────────────────────────────────────────
class Stock(Base):
    __tablename__ = "stocks"
    __table_args__ = (UniqueConstraint("product_id", "size", "color", "branch_id", name="uq_stock_per_branch"),)
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    branch_id  = Column(Integer, ForeignKey("branches.id"), nullable=True)
    size = Column(String(10))
    color = Column(String(50))
    quantity = Column(Integer, default=0)
    min_quantity = Column(Integer, default=3)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    product = relationship("Product", back_populates="stocks")
    branch  = relationship("Branch", foreign_keys=[branch_id])

# ─── ORDER ───────────────────────────────────────────────
class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"))
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.NEW)
    total_amount = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0)
    delivery_amount = Column(Float, default=5)
    final_amount = Column(Float, nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_transaction_id = Column(String(200), nullable=True)
    delivery_address = Column(Text, nullable=True)
    delivery_lat = Column(Float, nullable=True)
    delivery_lon = Column(Float, nullable=True)
    courier_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    note = Column(Text, nullable=True)
    promo_code = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("User", back_populates="orders", foreign_keys=[customer_id])
    branch = relationship("Branch", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    size = Column(String(10))
    color = Column(String(50))
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

# ─── CART ────────────────────────────────────────────────
class Cart(Base):
    __tablename__ = "carts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("cart_id", "product_id", "size", "color"),)
    id = Column(Integer, primary_key=True)
    cart_id = Column(Integer, ForeignKey("carts.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    size = Column(String(10))
    color = Column(String(50))
    quantity = Column(Integer, default=1)

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product")

# ─── LOYALTY ─────────────────────────────────────────────
class LoyaltyAccount(Base):
    __tablename__ = "loyalty_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    points = Column(Integer, default=0)
    level = Column(Enum(LoyaltyLevel), default=LoyaltyLevel.BRONZE)
    total_spent = Column(Float, default=0)
    referral_code = Column(String(20), unique=True)
    referred_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", back_populates="loyalty", foreign_keys=[user_id])

# ─── PROMO CODE ──────────────────────────────────────────
class PromoCode(Base):
    __tablename__ = "promo_codes"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_percent = Column(Float, nullable=False)
    max_uses = Column(Integer, default=100)
    used_count = Column(Integer, default=0)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ─── REVIEW ──────────────────────────────────────────────
class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    images = Column(JSON, default=[])
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")

# ─── FAVORITE ────────────────────────────────────────────
class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "product_id"),)
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="favorites")
    product = relationship("Product", back_populates="favorites")

# ─── FLASH SALE ──────────────────────────────────────────
class FlashSale(Base):
    __tablename__ = "flash_sales"
    id = Column(Integer, primary_key=True)
    title_uz = Column(String(300))
    title_ru = Column(String(300))
    discount_percent = Column(Float, nullable=False)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    product_ids = Column(JSON, default=[])
    category_ids = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)

# ─── SHIFT (SMENA) ───────────────────────────────────────
class ShiftStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Shift(Base):
    __tablename__ = "shifts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    check_in_time = Column(DateTime(timezone=True), nullable=False)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    check_in_lat = Column(Float, nullable=True)
    check_in_lon = Column(Float, nullable=True)
    check_out_lat = Column(Float, nullable=True)
    check_out_lon = Column(Float, nullable=True)
    status = Column(Enum(ShiftStatus), default=ShiftStatus.ACTIVE)
    duration_minutes = Column(Integer, nullable=True)
    overtime_minutes = Column(Integer, default=0)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
    branch = relationship("Branch")

# ─── NOTIFICATION ────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(300))
    body = Column(Text)
    is_sent = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    failed_count = Column(Integer, default=0)
    failed_reason = Column(String(500), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")

# ─── PAYME TRANSACTION ───────────────────────────────────
class PaymeTransaction(Base):
    __tablename__ = "payme_transactions"
    id = Column(Integer, primary_key=True)
    transaction_id = Column(String(100), unique=True, nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    amount = Column(Integer, nullable=False)   # tiyin
    state = Column(Integer, default=1)         # 1=created, 2=performed, -1=cancelled
    reason = Column(Integer, nullable=True)
    create_time = Column(Integer, nullable=True)
    perform_time = Column(Integer, default=0)
    cancel_time = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
