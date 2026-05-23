"""Complete schema — all tables for PostgreSQL

Revision ID: 002
Revises: 001
Create Date: 2025-05-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def _col_exists(table, col):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return col in [c["name"] for c in insp.get_columns(table)]


def _table_exists(table):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return table in insp.get_table_names()


def upgrade():
    # ── Fix users table: add missing columns ─────────────────────────────────
    if not _col_exists("users", "email"):
        op.add_column("users", sa.Column("email", sa.String(200), nullable=True))
        op.create_index("ix_users_email", "users", ["email"], unique=True)
    if not _col_exists("users", "google_id"):
        op.add_column("users", sa.Column("google_id", sa.String(100), nullable=True))
        op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)
    if not _col_exists("users", "updated_at"):
        op.add_column("users", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))

    # ── Fix branches: add lat/lon ─────────────────────────────────────────────
    if not _table_exists("branches"):
        op.create_table("branches",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("address", sa.String(500)),
            sa.Column("phone", sa.String(20)),
            sa.Column("latitude", sa.Float, nullable=True),
            sa.Column("longitude", sa.Float, nullable=True),
            sa.Column("is_active", sa.Boolean, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
    else:
        if not _col_exists("branches", "latitude"):
            op.add_column("branches", sa.Column("latitude", sa.Float, nullable=True))
        if not _col_exists("branches", "longitude"):
            op.add_column("branches", sa.Column("longitude", sa.Float, nullable=True))

    # ── Fix categories: add name_en ───────────────────────────────────────────
    if not _col_exists("categories", "name_en"):
        op.add_column("categories", sa.Column("name_en", sa.String(200), nullable=True))

    # ── Fix products: add missing columns ────────────────────────────────────
    for col, typ in [
        ("name_en", sa.String(300)),
        ("description_ru", sa.Text()),
        ("material", sa.String(200)),
        ("care_instructions", sa.Text()),
        ("is_trending", sa.Boolean),
        ("is_new_arrival", sa.Boolean),
        ("views_count", sa.Integer),
        ("sales_count", sa.Integer),
        ("updated_at", sa.DateTime(timezone=True)),
    ]:
        if not _col_exists("products", col):
            if col in ("is_trending", "is_new_arrival"):
                op.add_column("products", sa.Column(col, sa.Boolean, server_default=sa.false()))
            elif col in ("views_count", "sales_count"):
                op.add_column("products", sa.Column(col, sa.Integer, server_default="0"))
            else:
                op.add_column("products", sa.Column(col, typ, nullable=True))

    # ── stocks ────────────────────────────────────────────────────────────────
    if not _table_exists("stocks"):
        op.create_table("stocks",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
            sa.Column("branch_id", sa.Integer, sa.ForeignKey("branches.id"), nullable=True),
            sa.Column("size", sa.String(10), nullable=False, server_default="ONE SIZE"),
            sa.Column("color", sa.String(50), nullable=False, server_default="Default"),
            sa.Column("quantity", sa.Integer, server_default="0"),
            sa.Column("min_quantity", sa.Integer, server_default="3"),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("product_id", "size", "color", "branch_id", name="uq_stock_per_branch"),
        )

    # ── orders ────────────────────────────────────────────────────────────────
    if not _table_exists("orders"):
        op.create_table("orders",
            sa.Column("id", sa.Integer, primary_key=True, index=True),
            sa.Column("customer_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
            sa.Column("branch_id", sa.Integer, sa.ForeignKey("branches.id"), nullable=True),
            sa.Column("operator_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
            sa.Column("courier_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
            sa.Column("status", sa.String(20), server_default="new"),
            sa.Column("total_amount", sa.Float, nullable=False),
            sa.Column("discount_amount", sa.Float, server_default="0"),
            sa.Column("delivery_amount", sa.Float, server_default="5"),
            sa.Column("final_amount", sa.Float, nullable=False),
            sa.Column("payment_method", sa.String(20), nullable=True),
            sa.Column("payment_status", sa.String(20), server_default="pending"),
            sa.Column("payment_transaction_id", sa.String(200), nullable=True),
            sa.Column("delivery_address", sa.Text, nullable=True),
            sa.Column("delivery_lat", sa.Float, nullable=True),
            sa.Column("delivery_lon", sa.Float, nullable=True),
            sa.Column("note", sa.Text, nullable=True),
            sa.Column("promo_code", sa.String(50), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )

    # ── order_items ───────────────────────────────────────────────────────────
    if not _table_exists("order_items"):
        op.create_table("order_items",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("order_id", sa.Integer, sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
            sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=True),
            sa.Column("size", sa.String(10)),
            sa.Column("color", sa.String(50)),
            sa.Column("quantity", sa.Integer, nullable=False),
            sa.Column("price", sa.Float, nullable=False),
        )

    # ── carts ─────────────────────────────────────────────────────────────────
    if not _table_exists("carts"):
        op.create_table("carts",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), unique=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # ── cart_items ────────────────────────────────────────────────────────────
    if not _table_exists("cart_items"):
        op.create_table("cart_items",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("cart_id", sa.Integer, sa.ForeignKey("carts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=False),
            sa.Column("size", sa.String(10), server_default=""),
            sa.Column("color", sa.String(50), server_default=""),
            sa.Column("quantity", sa.Integer, server_default="1"),
            sa.UniqueConstraint("cart_id", "product_id", "size", "color"),
        )

    # ── loyalty_accounts ──────────────────────────────────────────────────────
    if not _table_exists("loyalty_accounts"):
        op.create_table("loyalty_accounts",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), unique=True),
            sa.Column("points", sa.Integer, server_default="0"),
            sa.Column("level", sa.String(20), server_default="bronze"),
            sa.Column("total_spent", sa.Float, server_default="0"),
            sa.Column("referral_code", sa.String(20), unique=True, nullable=True),
            sa.Column("referred_by", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        )

    # ── promo_codes ───────────────────────────────────────────────────────────
    if not _table_exists("promo_codes"):
        op.create_table("promo_codes",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("code", sa.String(50), unique=True, nullable=False, index=True),
            sa.Column("discount_percent", sa.Float, nullable=False),
            sa.Column("max_uses", sa.Integer, server_default="100"),
            sa.Column("used_count", sa.Integer, server_default="0"),
            sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_active", sa.Boolean, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # ── reviews ───────────────────────────────────────────────────────────────
    if not _table_exists("reviews"):
        op.create_table("reviews",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=False),
            sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
            sa.Column("rating", sa.Integer, nullable=False),
            sa.Column("comment", sa.Text, nullable=True),
            sa.Column("images", sa.JSON, server_default="[]"),
            sa.Column("is_approved", sa.Boolean, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # ── favorites ─────────────────────────────────────────────────────────────
    if not _table_exists("favorites"):
        op.create_table("favorites",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
            sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("user_id", "product_id"),
        )

    # ── flash_sales ───────────────────────────────────────────────────────────
    if not _table_exists("flash_sales"):
        op.create_table("flash_sales",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("title_uz", sa.String(300), nullable=True),
            sa.Column("title_ru", sa.String(300), nullable=True),
            sa.Column("discount_percent", sa.Float, nullable=False),
            sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("product_ids", sa.JSON, server_default="[]"),
            sa.Column("category_ids", sa.JSON, server_default="[]"),
            sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        )

    # ── shifts ────────────────────────────────────────────────────────────────
    if not _table_exists("shifts"):
        op.create_table("shifts",
            sa.Column("id", sa.Integer, primary_key=True, index=True),
            sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
            sa.Column("branch_id", sa.Integer, sa.ForeignKey("branches.id"), nullable=True),
            sa.Column("check_in_time", sa.DateTime(timezone=True), nullable=False),
            sa.Column("check_out_time", sa.DateTime(timezone=True), nullable=True),
            sa.Column("check_in_lat", sa.Float, nullable=True),
            sa.Column("check_in_lon", sa.Float, nullable=True),
            sa.Column("check_out_lat", sa.Float, nullable=True),
            sa.Column("check_out_lon", sa.Float, nullable=True),
            sa.Column("status", sa.String(20), server_default="active"),
            sa.Column("duration_minutes", sa.Integer, nullable=True),
            sa.Column("overtime_minutes", sa.Integer, server_default="0"),
            sa.Column("note", sa.Text, nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # ── notifications ─────────────────────────────────────────────────────────
    if not _table_exists("notifications"):
        op.create_table("notifications",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
            sa.Column("title", sa.String(300), nullable=True),
            sa.Column("body", sa.Text, nullable=True),
            sa.Column("is_sent", sa.Boolean, server_default=sa.false()),
            sa.Column("is_read", sa.Boolean, server_default=sa.false()),
            sa.Column("failed_count", sa.Integer, server_default="0"),
            sa.Column("failed_reason", sa.String(500), nullable=True),
            sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # ── payme_transactions ────────────────────────────────────────────────────
    if not _table_exists("payme_transactions"):
        op.create_table("payme_transactions",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("transaction_id", sa.String(100), unique=True, nullable=False),
            sa.Column("order_id", sa.Integer, sa.ForeignKey("orders.id"), nullable=False),
            sa.Column("amount", sa.BigInteger, nullable=False),  # tiyin
            sa.Column("state", sa.Integer, server_default="1"),  # 1=created,2=completed,-1=cancelled
            sa.Column("reason", sa.Integer, nullable=True),
            sa.Column("create_time", sa.BigInteger, nullable=True),
            sa.Column("perform_time", sa.BigInteger, server_default="0"),
            sa.Column("cancel_time", sa.BigInteger, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )


def downgrade():
    for t in ["payme_transactions", "notifications", "shifts", "flash_sales",
              "favorites", "reviews", "promo_codes", "loyalty_accounts",
              "cart_items", "carts", "order_items", "orders", "stocks"]:
        op.drop_table(t)
