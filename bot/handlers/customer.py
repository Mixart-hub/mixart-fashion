"""
Mijozlar uchun handlerlar — /start, /lang, /myorders, AI chat.
Bot sozlamalari 60 soniya keshlanadi (har xabarda disk o'qilmaydi).
AI chat uchun rate limiting mavjud.
"""
from aiogram import Router, F
from aiogram.types import (
    Message, CallbackQuery,
    InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo,
    ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove,
)
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
import httpx, logging, json, os, time
from config import settings
from i18n import t, detect_lang

router = Router()
log = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(20.0)

# ─── Settings cache ──────────────────────────────────────────────────────────
_SETTINGS_CACHE: dict = {}
_SETTINGS_TS: float = 0.0
_SETTINGS_TTL = 60  # sekund


def get_bot_setting(key: str, default: str = "") -> str:
    global _SETTINGS_CACHE, _SETTINGS_TS
    now = time.monotonic()
    if now - _SETTINGS_TS > _SETTINGS_TTL:
        try:
            base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            path = os.path.abspath(os.path.join(base, "..", "bot_settings.json"))
            if os.path.exists(path):
                with open(path, encoding="utf-8") as f:
                    _SETTINGS_CACHE = json.load(f)
            _SETTINGS_TS = now
        except Exception:
            pass
    return _SETTINGS_CACHE.get(key, default) or default


# ─── AI Rate limiting ─────────────────────────────────────────────────────────
_AI_LAST: dict = {}          # {user_id: timestamp}
_AI_COOLDOWN = 3             # minimum 3 soniya oraliq


# ─── Klaviatura matnlari (reply keyboard tugmalari) ──────────────────────────
SHOP_TEXTS = {"🛍 Do'konga kirish", "🛍 Открыть магазин", "🛍 Open store",
              "🛍 Do'konni ochish"}
ORDER_TEXTS = {"📦 Buyurtmalarim", "📦 Мои заказы", "📦 My orders"}
PROFILE_TEXTS = {"👤 Profil", "👤 Профиль", "👤 Profile"}
HELP_TEXTS = {"💬 Yordam", "💬 Помощь", "💬 Help", "Yordam", "Помощь", "Help"}

STATUS_CANCEL_ALLOWED = {"new"}  # faqat shu holatdagi buyurtmalarni bekor qilish mumkin


# ─── Helpers ──────────────────────────────────────────────────────────────────
async def auth_user(telegram_id: str, full_name: str, lang: str = "uz") -> tuple:
    """(user_dict, token) qaytaradi."""
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(8.0)) as client:
            r = await client.post(
                f"{settings.API_URL}/auth/telegram",
                params={"telegram_id": telegram_id, "full_name": full_name, "language": lang}
            )
            if r.status_code == 200:
                token = r.json().get("access_token", "")
                me = await client.get(
                    f"{settings.API_URL}/auth/me",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if me.status_code == 200:
                    return me.json(), token
    except Exception as e:
        log.warning(f"auth_user xato: {e}")
    return {}, ""


def shop_keyboard(user_id: int, lang: str = "uz") -> InlineKeyboardMarkup:
    btn_text = get_bot_setting(f"btn_shop_{lang}") or t("shop_btn", lang)
    twa_url = settings.TWA_URL
    sep = "&" if "?" in twa_url else "?"
    twa_url = f"{twa_url}{sep}user_id={user_id}"
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=btn_text, web_app=WebAppInfo(url=twa_url))
    ]])


def customer_reply_kb(lang: str = "uz") -> ReplyKeyboardMarkup:
    SHOP_BTN = {"uz": "🛍 Do'konni ochish", "ru": "🛍 Открыть магазин", "en": "🛍 Open store"}
    ORD_BTN  = {"uz": "📦 Buyurtmalarim",   "ru": "📦 Мои заказы",      "en": "📦 My orders"}
    PROF_BTN = {"uz": "👤 Profil",          "ru": "👤 Профиль",         "en": "👤 Profile"}
    HELP_BTN = {"uz": "💬 Yordam",          "ru": "💬 Помощь",          "en": "💬 Help"}
    return ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text=SHOP_BTN.get(lang, SHOP_BTN["uz"]))],
        [KeyboardButton(text=ORD_BTN.get(lang, ORD_BTN["uz"])),
         KeyboardButton(text=PROF_BTN.get(lang, PROF_BTN["uz"]))],
        [KeyboardButton(text=HELP_BTN.get(lang, HELP_BTN["uz"]))],
    ], resize_keyboard=True)


def operator_reply_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="📋 Yangi buyurtmalar"), KeyboardButton(text="⚙️ Jarayondagi")],
        [KeyboardButton(text="🚚 Yo'ldagi"),          KeyboardButton(text="📊 Statistika")],
        [KeyboardButton(text="📈 Hisobot"),           KeyboardButton(text="🖥 Dashboard")],
    ], resize_keyboard=True)


def seller_reply_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="📋 Yangi buyurtmalar")],
        [KeyboardButton(text="📊 Statistika")],
    ], resize_keyboard=True)


def lang_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🇺🇿 O'zbek", callback_data="lang:uz"),
        InlineKeyboardButton(text="🇷🇺 Русский", callback_data="lang:ru"),
        InlineKeyboardButton(text="🇬🇧 English", callback_data="lang:en"),
    ]])


def fmt_money(amount) -> str:
    try:
        return f"{int(amount):,}".replace(",", " ")
    except Exception:
        return str(amount)


STATUS_LABELS = {
    "new": "🆕 Yangi", "processing": "⚙️ Jarayonda",
    "shipped": "🚚 Yo'lda", "delivered": "✅ Yetkazildi",
    "cancelled": "❌ Bekor", "returned": "↩️ Qaytarildi",
}


# ─── /start ──────────────────────────────────────────────────────────────────
@router.message(CommandStart())
async def start_handler(msg: Message, state: FSMContext):
    try:
        data = await state.get_data()
        name = msg.from_user.first_name or "Foydalanuvchi"
        full_name = msg.from_user.full_name or name

        tg_lang = detect_lang(msg.from_user.language_code)
        user, token = await auth_user(str(msg.from_user.id), full_name, tg_lang)
        role = user.get("role", "customer")

        # DB dan saqlangan tilni olish; yo'q bo'lsa Telegram tilini ishlatish
        lang = data.get("lang") or user.get("language") or tg_lang

        # Rolni va tilni keshga saqlash
        await state.update_data(lang=lang, role=role, token=token)

        if role == "operator":
            text = get_bot_setting("operator_welcome") or t("welcome_operator", lang, name=name)
            await msg.answer(text, reply_markup=operator_reply_kb())
        elif role == "seller":
            text = get_bot_setting("seller_welcome") or t("welcome_seller", lang, name=name)
            await msg.answer(text, reply_markup=seller_reply_kb())
        elif role == "admin":
            admin_url = settings.API_URL.replace("/api/v1", "") + "/admin"
            text = t("welcome_admin", lang, name=name, admin_url=admin_url)
            await msg.answer(text, reply_markup=operator_reply_kb())
        else:
            wkey = f"welcome_{lang}"
            text = get_bot_setting(wkey)
            if text:
                text = text.replace("{name}", name)
            else:
                text = t("welcome_customer", lang, name=name)
            await msg.answer(text, reply_markup=customer_reply_kb(lang))
            await msg.answer(
                t("shop_btn", lang),
                reply_markup=shop_keyboard(msg.from_user.id, lang),
            )

    except Exception as e:
        log.error(f"start xato: {e}")
        await msg.answer(
            t("welcome_customer", "uz", name=msg.from_user.first_name or "Foydalanuvchi"),
            reply_markup=customer_reply_kb("uz"),
        )
        await msg.answer(
            t("shop_btn", "uz"),
            reply_markup=shop_keyboard(msg.from_user.id, "uz"),
        )


# ─── /lang ───────────────────────────────────────────────────────────────────
@router.message(Command("lang"))
async def select_lang(msg: Message):
    await msg.answer(t("select_lang", "uz"), reply_markup=lang_keyboard())


@router.callback_query(F.data.startswith("lang:"))
async def set_lang(cb: CallbackQuery, state: FSMContext):
    lang = cb.data.split(":")[1]
    await state.update_data(lang=lang)
    names = {"uz": "O'zbek 🇺🇿", "ru": "Русский 🇷🇺", "en": "English 🇬🇧"}
    await cb.message.edit_text(t("lang_changed", lang, lang=names.get(lang, lang)))
    data = await state.get_data()
    role = data.get("role", "customer")
    if role == "customer":
        await cb.message.answer("✅", reply_markup=customer_reply_kb(lang))
    await cb.answer()


# ─── /myorders ───────────────────────────────────────────────────────────────
@router.message(Command("myorders"))
async def my_orders(msg: Message, state: FSMContext):
    """Mijozning oxirgi buyurtmalari."""
    data = await state.get_data()
    lang = data.get("lang") or detect_lang(msg.from_user.language_code)
    name = msg.from_user.full_name or msg.from_user.first_name or "User"

    await msg.answer(t("orders_loading", lang))

    try:
        _, token = await auth_user(str(msg.from_user.id), name, lang)
        if not token:
            await msg.answer(t("auth_error", lang))
            return

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                f"{settings.API_URL}/orders/",
                headers={"Authorization": f"Bearer {token}"},
                params={"limit": 5},
            )

        if r.status_code != 200:
            await msg.answer(t("server_error", lang))
            return

        orders = r.json().get("items", [])
        if not orders:
            await msg.answer(t("orders_empty", lang))
            return

        await msg.answer(t("orders_header", lang, count=len(orders)))
        for o in orders:
            status = STATUS_LABELS.get(o.get("status", ""), o.get("status", ""))
            text = (
                f"📦 <b>#{o['id']}</b> — {status}\n"
                f"💰 {fmt_money(o.get('final_amount', 0))} so'm\n"
                f"📅 {o.get('created_at', '—')[:10] if o.get('created_at') else '—'}"
            )
            items = o.get("items", [])
            if items:
                text += "\n" + ", ".join(
                    it.get("product_name", "—") for it in items[:3]
                )
                if len(items) > 3:
                    text += f" va yana {len(items) - 3} ta"
            await msg.answer(text)

    except Exception as e:
        log.error(f"myorders xato: {e}")
        await msg.answer(t("server_error", lang))


# ─── Yordam ──────────────────────────────────────────────────────────────────
@router.message(F.text.func(lambda t: t in HELP_TEXTS))
async def help_handler(msg: Message, state: FSMContext):
    data = await state.get_data()
    lang = data.get("lang") or detect_lang(msg.from_user.language_code)
    text = get_bot_setting("help_text") or t("help_text", lang)
    await msg.answer(text)


# ─── Do'kon tugmasi ───────────────────────────────────────────────────────────
@router.message(F.text.func(lambda txt: txt in SHOP_TEXTS))
async def shop_btn_handler(msg: Message, state: FSMContext):
    data = await state.get_data()
    lang = data.get("lang") or detect_lang(msg.from_user.language_code)
    await msg.answer(
        t("shop_btn", lang),
        reply_markup=shop_keyboard(msg.from_user.id, lang),
    )


# ─── Buyurtmalarim tugmasi ───────────────────────────────────────────────────
@router.message(F.text.func(lambda txt: txt in ORDER_TEXTS))
async def orders_btn_handler(msg: Message, state: FSMContext):
    await my_orders(msg, state)


# ─── /profile ────────────────────────────────────────────────────────────────
@router.message(Command("profile"))
@router.message(F.text.func(lambda txt: txt in PROFILE_TEXTS))
async def profile_handler(msg: Message, state: FSMContext):
    data = await state.get_data()
    lang = data.get("lang") or detect_lang(msg.from_user.language_code)
    name = msg.from_user.full_name or msg.from_user.first_name or "User"

    user, token = await auth_user(str(msg.from_user.id), name, lang)
    if not user:
        await msg.answer(t("auth_error", lang))
        return

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            loyalty_r = await client.get(
                f"{settings.API_URL}/users/{user['id']}/loyalty",
                headers={"Authorization": f"Bearer {token}"},
            )
            orders_r = await client.get(
                f"{settings.API_URL}/orders/",
                headers={"Authorization": f"Bearer {token}"},
                params={"customer_id": user["id"], "limit": 1},
            )

        loyalty = loyalty_r.json() if loyalty_r.status_code == 200 else {}
        orders_count = orders_r.json().get("total", 0) if orders_r.status_code == 200 else 0

        text = t("profile_title", lang) + "\n\n" + t("profile_body", lang,
            name=user.get("full_name", name),
            phone=user.get("phone") or "—",
            lang={"uz": "O'zbek 🇺🇿", "ru": "Русский 🇷🇺", "en": "English 🇬🇧"}.get(lang, lang),
            level=loyalty.get("level", "bronze").capitalize(),
            points=loyalty.get("points", 0),
            orders=orders_count,
        )
        await msg.answer(text, parse_mode="HTML")
    except Exception as e:
        log.error(f"profile xato: {e}")
        await msg.answer(t("server_error", lang))


# ─── /track — buyurtma holatini kuzatish ─────────────────────────────────────
@router.message(Command("track"))
async def track_handler(msg: Message, state: FSMContext):
    data = await state.get_data()
    lang = data.get("lang") or detect_lang(msg.from_user.language_code)
    name = msg.from_user.full_name or msg.from_user.first_name or "User"

    # /track yoki /track 123 (order_id bilan)
    args = msg.text.split()
    specific_id = int(args[1]) if len(args) > 1 and args[1].isdigit() else None

    _, token = await auth_user(str(msg.from_user.id), name, lang)
    if not token:
        await msg.answer(t("auth_error", lang))
        return

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            if specific_id:
                r = await client.get(
                    f"{settings.API_URL}/orders/{specific_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                orders = [r.json()] if r.status_code == 200 else []
            else:
                r = await client.get(
                    f"{settings.API_URL}/orders/",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"limit": 3},
                )
                orders = r.json().get("items", []) if r.status_code == 200 else []

        if not orders:
            await msg.answer(t("track_none", lang))
            return

        for o in orders:
            status_label = STATUS_LABELS.get(o.get("status", ""), o.get("status", ""))
            text = t("track_title", lang, id=o["id"]) + "\n\n" + t("track_body", lang,
                status=status_label,
                amount=fmt_money(o.get("final_amount", 0)),
                payment=o.get("payment_method") or "—",
                pay_status=o.get("payment_status") or "—",
                date=str(o.get("created_at", "—"))[:10],
            )
            await msg.answer(text, parse_mode="HTML")
    except Exception as e:
        log.error(f"track xato: {e}")
        await msg.answer(t("server_error", lang))


# ─── /cancel — oxirgi buyurtmani bekor qilish ────────────────────────────────
@router.message(Command("cancel"))
async def cancel_handler(msg: Message, state: FSMContext):
    data = await state.get_data()
    lang = data.get("lang") or detect_lang(msg.from_user.language_code)
    name = msg.from_user.full_name or msg.from_user.first_name or "User"

    _, token = await auth_user(str(msg.from_user.id), name, lang)
    if not token:
        await msg.answer(t("auth_error", lang))
        return

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                f"{settings.API_URL}/orders/",
                headers={"Authorization": f"Bearer {token}"},
                params={"limit": 1},
            )

        if r.status_code != 200:
            await msg.answer(t("server_error", lang))
            return

        orders = r.json().get("items", [])
        if not orders:
            await msg.answer(t("cancel_none", lang))
            return

        order = orders[0]
        order_id = order["id"]
        status = order.get("status", "")

        if status not in STATUS_CANCEL_ALLOWED:
            await msg.answer(t("cancel_failed", lang,
                id=order_id,
                status=STATUS_LABELS.get(status, status),
            ))
            return

        # Bekor qilish
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            cancel_r = await client.patch(
                f"{settings.API_URL}/orders/{order_id}/status",
                headers={"Authorization": f"Bearer {token}"},
                params={"new_status": "cancelled"},
            )

        if cancel_r.status_code == 200:
            await msg.answer(t("cancel_done", lang, id=order_id), parse_mode="HTML")
        else:
            await msg.answer(t("server_error", lang))

    except Exception as e:
        log.error(f"cancel xato: {e}")
        await msg.answer(t("server_error", lang))


# ─── /contact ─────────────────────────────────────────────────────────────────
@router.message(Command("contact"))
async def contact_handler(msg: Message, state: FSMContext):
    data = await state.get_data()
    lang = data.get("lang") or detect_lang(msg.from_user.language_code)
    await msg.answer(t("contact_text", lang), parse_mode="HTML")


# ─── AI Chat (barcha qolgan matnlar) ─────────────────────────────────────────
@router.message(F.text)
async def ai_chat_handler(msg: Message, state: FSMContext):
    uid = msg.from_user.id
    now = time.monotonic()

    # Rate limiting
    if now - _AI_LAST.get(uid, 0) < _AI_COOLDOWN:
        return
    _AI_LAST[uid] = now

    data = await state.get_data()
    lang = data.get("lang") or detect_lang(msg.from_user.language_code)

    await msg.bot.send_chat_action(msg.chat.id, "typing")

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(
                f"{settings.API_URL}/ai/chat",
                json={
                    "message": msg.text,
                    "user_id": str(uid),
                    "role": "customer",
                },
            )
            if r.status_code == 200:
                reply = r.json().get("text", "")
                if reply:
                    await msg.answer(reply)
                    return
    except Exception as e:
        log.warning(f"Bot AI chat xato: {e}")

    await msg.answer(get_bot_setting("help_text") or t("help_text", lang))
