from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder
from config import settings

def main_menu_kb(lang="uz"):
    texts = {
        "uz": {"shop": "🛍 Do'konga kirish", "orders": "📦 Buyurtmalarim", "profile": "👤 Profil", "help": "💬 Yordam"},
        "ru": {"shop": "🛍 Открыть магазин", "orders": "📦 Мои заказы", "profile": "👤 Профиль", "help": "💬 Помощь"},
    }
    t = texts.get(lang, texts["uz"])
    builder = ReplyKeyboardBuilder()
    builder.button(text=t["shop"])
    builder.button(text=t["orders"])
    builder.button(text=t["profile"])
    builder.button(text=t["help"])
    builder.adjust(2)
    return builder.as_markup(resize_keyboard=True)

def open_twa_kb(user_id: int, lang="uz"):
    label = "🛍 Do'konni ochish" if lang == "uz" else "🛍 Открыть магазин"
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text=label,
            web_app=WebAppInfo(url=f"{settings.TWA_URL}?user_id={user_id}")
        )
    ]])

def order_actions_kb(order_id: int, status: str):
    builder = InlineKeyboardBuilder()
    next_statuses = {
        "new": [("✅ Qabul qilish", "processing")],
        "processing": [("🚚 Yo'lga chiqarildi", "shipped")],
        "shipped": [("✔️ Yetkazildi", "delivered")],
    }
    for label, next_status in next_statuses.get(status, []):
        builder.button(text=label, callback_data=f"order_status:{order_id}:{next_status}")
    builder.button(text="❌ Bekor qilish", callback_data=f"order_status:{order_id}:cancelled")
    builder.button(text="📋 Batafsil", callback_data=f"order_detail:{order_id}")
    builder.adjust(2)
    return builder.as_markup()

def lang_kb():
    builder = InlineKeyboardBuilder()
    builder.button(text="🇺🇿 O'zbek", callback_data="lang:uz")
    builder.button(text="🇷🇺 Русский", callback_data="lang:ru")
    builder.button(text="🇬🇧 English", callback_data="lang:en")
    builder.adjust(3)
    return builder.as_markup()

def payment_kb(order_id: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="💳 Click", callback_data=f"pay:click:{order_id}")
    builder.button(text="💳 Payme", callback_data=f"pay:payme:{order_id}")
    builder.button(text="💵 Naqd", callback_data=f"pay:cash:{order_id}")
    builder.adjust(2)
    return builder.as_markup()
