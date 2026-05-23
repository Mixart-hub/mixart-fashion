"""Initial migration

Revision ID: 001
Revises:
Create Date: 2025-04-24
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # users
    op.create_table('users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('telegram_id', sa.String(50), unique=True, nullable=True),
        sa.Column('full_name', sa.String(200), nullable=False),
        sa.Column('phone', sa.String(20), unique=True, nullable=True),
        sa.Column('password_hash', sa.String(200), nullable=True),
        sa.Column('language', sa.String(5), default='uz'),
        sa.Column('role', sa.String(20), default='customer'),
        sa.Column('branch_id', sa.Integer, sa.ForeignKey('branches.id'), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    # branches
    op.create_table('branches',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('address', sa.String(500)),
        sa.Column('phone', sa.String(20)),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    # categories
    op.create_table('categories',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name_uz', sa.String(200), nullable=False),
        sa.Column('name_ru', sa.String(200)),
        sa.Column('emoji', sa.String(10), default='👗'),
        sa.Column('parent_id', sa.Integer, sa.ForeignKey('categories.id'), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('sort_order', sa.Integer, default=0),
    )
    # products
    op.create_table('products',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name_uz', sa.String(300), nullable=False),
        sa.Column('name_ru', sa.String(300)),
        sa.Column('description_uz', sa.Text),
        sa.Column('price', sa.Float, nullable=False),
        sa.Column('old_price', sa.Float, nullable=True),
        sa.Column('category_id', sa.Integer, sa.ForeignKey('categories.id')),
        sa.Column('images', sa.JSON, default=[]),
        sa.Column('sizes', sa.JSON, default=[]),
        sa.Column('colors', sa.JSON, default=[]),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_trending', sa.Boolean, default=False),
        sa.Column('is_new_arrival', sa.Boolean, default=False),
        sa.Column('views_count', sa.Integer, default=0),
        sa.Column('sales_count', sa.Integer, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table('products')
    op.drop_table('categories')
    op.drop_table('branches')
    op.drop_table('users')
