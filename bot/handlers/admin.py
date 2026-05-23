"""
Admin handlerlari — /admin, /broadcast, /brief, /stats.
Barcha buyruqlar rol tekshiruvi bilan himoyalangan.
"""
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.fsm.context import FSMContext
import httpx, logging
from config import settings
from i18n import t

router = Router()
log = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(15.0)


def fmt_money(amount) -> str:
    try:
        return f"{int(amount):,}".replace(",", " ")
    except Exception:
        return str(amount)


async def get_role_cached(state: FSMContext, telegram_id: str) -> str:
    """FSM cache orqali rolni oladi, kerak bo'lsa API ga so'raydi."""
    data = await state.get_data()
    role = data.get("role")
    if role:
        return role
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(
                f"{settings.API_URL}/auth/telegram",
                params={"telegram_id": telegram_id, "full_name": "User", "language": "uz"}
            )
            if r.status_code == 200:
                token = r.json().get("access_token", "")
                me = await client.get(
                    f"{settings.API_URL}/auth/me",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if me.status_code == 200:
                    role = me.json().get("role", "customer")
                    await state.update_data(role=role, token=token)
                    return role
    except Exception as e:
        log.warning(f"get_role_cached xato: {e}")
    return "customer"


@router.message(Command("admin"))
async def admin_panel(msg: Message, state: FSMContext):
    role = await get_role_cached(state, str(msg.from_user.id))
    if role != "admin":
        await msg.answer(t("no_permission", "uz"))
        return

    admin_url = settings.API_URL.replace("/api/v1", "") + "/admin"
    builder = InlineKeyboardBuilder()
    builder.button(text="📊 Statistika", callback_data="adm:stats")
    builder.button(text="📦 Yangi buyurtmalar", callback_data="adm:orders")
    builder.button(text="⚠️ Sklad holati", callback_data="adm:stock")
    builder.button(text="✨ AI tavsiyalar", callback_data="adm:suggest")
    builder.button(text="🌅 Ertangi xulosa", callback_data="adm:brief")
    builder.button(text="👥 Mijozlar soni", callback_data="adm:customers")
    builder.adjust(2)

    await msg.answer(
        f"🛍 <b>Mixart Fashion — Admin Panel</b>\n\n"
        f"🌐 <a href='{admin_url}'>Admin panelni ochish →</a>",
        reply_markup=builder.as_markup(),
        disable_web_page_preview=True,
    )


@router.callback_query(F.data.startswith("adm:"))
async def admin_action(cb: CallbackQuery, state: FSMContext):
    role = await get_role_cached(state, str(cb.from_user.id))
    if role != "admin":
        await cb.answer(t("no_permission", "uz"), show_alert=True)
        return

    action = cb.data.split(":")[1]
    await cb.answer()

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:

            if action == "stats":
                r = await client.get(f"{settings.API_URL}/orders/stats")
                if r.status_code == 200:
                    s = r.json()
                    await cb.message.answer(
                        f"📊 <b>Statistika</b>\n"
                        f"━━━━━━━━━━━━━━━\n"
                        f"🆕 Yangi: <b>{s.get('new_orders', 0)}</b>\n"
                        f"⚙️ Jarayonda: <b>{s.get('processing', 0)}</b>\n"
                        f"📦 Bugungi buyurtmalar: <b>{s.get('daily_orders', 0)}</b>\n"
                        f"📅 Oylik buyurtmalar: <b>{s.get('monthly_orders', 0)}</b>\n"
                        f"💰 Bugungi daromad: <b>{fmt_money(s.get('daily_revenue', 0))} so'm</b>\n"
                        f"📈 Oylik daromad: <b>{fmt_money(s.get('monthly_revenue', 0))} so'm</b>\n"
                        f"👥 Mijozlar: <b>{s.get('customers_total', 0)}</b>\n"
                        f"👗 Mahsulotlar: <b>{s.get('products_total', 0)}</b>"
                    )

            elif action == "orders":
                r = await client.get(f"{settings.API_URL}/orders/", params={"status": "new", "limit": 10})
                if r.status_code == 200:
                    orders = r.json().get("items", [])
                    if not orders:
                        await cb.message.answer("✅ Yangi buyurtmalar yo'q!")
                    else:
                        text = f"📦 <b>Yangi buyurtmalar ({len(orders)} ta):</b>\n\n"
                        for o in orders:
                            text += (
                                f"  #{o['id']} — {fmt_money(o.get('final_amount', 0))} so'm"
                                f" — {o.get('customer_name', '—')}\n"
                            )
                        await cb.message.answer(text)

            elif action == "stock":
                r = await client.get(f"{settings.API_URL}/ai/admin/suggestions")
                if r.status_code == 200:
                    suggs = r.json().get("suggestions", [])
                    warns = [s for s in suggs if s.get("type") in ("warning", "error")]
                    if not warns:
                        await cb.message.answer("✅ Sklad holati yaxshi!")
                    else:
                        text = "⚠️ <b>Sklad ogohlantirishlari:</b>\n\n"
                        for s in warns:
                            text += f"{s['icon']} {s['description']}\n"
                        await cb.message.answer(text)

            elif action == "suggest":
                r = await client.get(f"{settings.API_URL}/ai/admin/suggestions")
                if r.status_code == 200:
                    suggs = r.json().get("suggestions", [])
                    if not suggs:
                        await cb.message.answer("✅ Mix: Hamma narsa zo'r!")
                    else:
                        text = "✨ <b>Mix AI tavsiyalari:</b>\n\n"
                        for s in suggs:
                            text += f"{s['icon']} <b>{s['title']}</b>\n{s['description']}\n\n"
                        await cb.message.answer(text)

            elif action == "brief":
                await cb.message.answer("⏳ Mix ertangi xulosa tayyorlamoqda...")
                r = await client.get(f"{settings.API_URL}/ai/admin/morning-brief")
                if r.status_code == 200:
                    await cb.message.answer(r.json().get("message", "Xulosa tayyor emas"))
                else:
                    await cb.message.answer("❌ AI ishlamayapti (GEMINI_API_KEY kerak)")

            elif action == "customers":
                r = await client.get(f"{settings.API_URL}/users/", params={"role": "customer", "limit": 2000})
                if r.status_code == 200:
                    data = r.json()
                    count = len(data) if isinstance(data, list) else data.get("total", "?")
                    await cb.message.answer(f"👥 Jami mijozlar: <b>{count}</b>")

    except Exception as e:
        log.error(f"admin_action({action}) xato: {e}")
        await cb.message.answer("❌ Server bilan aloqa yo'q, qayta urinib ko'ring")


@router.message(Command("broadcast"))
async def broadcast_cmd(msg: Message, state: FSMContext):
    """Admin barcha mijozlarga xabar yuboradi."""
    role = await get_role_cached(state, str(msg.from_user.id))
    if role != "admin":
        await msg.answer(t("no_permission", "uz"))
        return

    text = msg.text.replace("/broadcast", "").strip()
    if not text:
        await msg.answer(
            "❌ Foydalanish:\n"
            "<code>/broadcast Yangi kolleksiya keldi!</code>"
        )
        return

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(
                f"{settings.API_URL}/bot/broadcast",
                json={"text": text, "role": "customer"},
            )
            if r.status_code == 200:
                res = r.json()
                await msg.answer(f"✅ {res.get('message', 'Xabar yuborildi!')}")
            else:
                await msg.answer(f"❌ Broadcast xato: {r.status_code}")
    except Exception as e:
        log.error(f"broadcast xato: {e}")
        await msg.answer("❌ Server bilan aloqa yo'q")


@router.message(Command("brief"))
async def morning_brief_cmd(msg: Message, state: FSMContext):
    """AI ertangi xulosa — /brief buyrug'i."""
    role = await get_role_cached(state, str(msg.from_user.id))
    if role not in ("admin",):
        await msg.answer(t("no_permission", "uz"))
        return

    await msg.answer("⏳ Mix ertangi xulosa tayyorlamoqda...")
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(f"{settings.API_URL}/ai/admin/morning-brief")
            if r.status_code == 200:
                await msg.answer(r.json().get("message", "Xulosa yo'q"))
            else:
                await msg.answer("❌ AI ishlamayapti")
    except Exception as e:
        log.error(f"brief xato: {e}")
        await msg.answer("❌ Xato yuz berdi")
