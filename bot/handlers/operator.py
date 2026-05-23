"""
Operator/seller handlerlari — buyurtmalarni ko'rish va boshqarish.
Role FSM state da keshlanadi (har buyruqda API call bo'lmaydi).
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

STATUS_LABELS = {
    "new":        "🆕 Yangi",
    "processing": "⚙️ Jarayonda",
    "shipped":    "🚚 Yo'lda",
    "delivered":  "✅ Yetkazildi",
    "cancelled":  "❌ Bekor",
    "returned":   "↩️ Qaytarildi",
}


def fmt_money(amount) -> str:
    try:
        return f"{int(amount):,}".replace(",", " ")
    except Exception:
        return str(amount)


def order_kb(order_id: int, status: str):
    builder = InlineKeyboardBuilder()
    next_actions = {
        "new":        [("✅ Qabul qilish", "processing")],
        "processing": [("🚚 Yo'lga chiqarildi", "shipped")],
        "shipped":    [("✔️ Yetkazildi", "delivered")],
    }
    for label, next_st in next_actions.get(status, []):
        builder.button(text=label, callback_data=f"ord:{order_id}:{next_st}")
    if status not in ("delivered", "cancelled", "returned"):
        builder.button(text="❌ Bekor qilish", callback_data=f"ord:{order_id}:cancelled")
    builder.adjust(1)
    return builder.as_markup()


def fmt_order(o: dict) -> str:
    status = STATUS_LABELS.get(o.get("status", ""), o.get("status", ""))
    text = f"📦 <b>Buyurtma #{o['id']}</b>\n"
    text += "━━━━━━━━━━━━━━━\n"
    text += f"👤 Mijoz: <b>{o.get('customer_name', '—')}</b>\n"
    if o.get("customer_phone"):
        text += f"📞 Tel: <code>{o['customer_phone']}</code>\n"
    if o.get("delivery_address"):
        text += f"📍 Manzil: {o['delivery_address']}\n"
    text += f"🏪 Filial: <b>{o.get('branch_name', 'Belgilanmagan')}</b>\n"
    if o.get("note"):
        text += f"💬 Izoh: {o['note']}\n"
    text += f"💳 To'lov: {o.get('payment_method', '—')}\n"
    text += f"💰 Jami: <b>{fmt_money(o.get('final_amount', 0))} so'm</b>\n"
    text += f"📊 Holat: {status}"
    items = o.get("items", [])
    if items:
        text += "\n\n<b>Mahsulotlar:</b>"
        for it in items[:10]:
            text += f"\n  • {it.get('product_name', '—')}"
            if it.get("size") or it.get("color"):
                text += f" ({it.get('size', '')}/{it.get('color', '')})"
            text += f" × {it.get('quantity', 1)} = {fmt_money(it.get('subtotal', 0))} so'm"
    return text


async def get_role_cached(state: FSMContext, telegram_id: str) -> str:
    """FSM cache dan rolni oladi."""
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


async def fetch_orders(status: str = None, limit: int = 10) -> list:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            params = {"limit": limit}
            if status:
                params["status"] = status
            r = await client.get(f"{settings.API_URL}/orders/", params=params)
            if r.status_code == 200:
                return r.json().get("items", [])
    except Exception as e:
        log.error(f"fetch_orders xato: {e}")
    return []


@router.message(Command("orders"))
async def list_orders(msg: Message, state: FSMContext):
    role = await get_role_cached(state, str(msg.from_user.id))
    if role not in ("admin", "operator", "seller"):
        await msg.answer(t("no_permission", "uz"))
        return

    await msg.answer("⏳ Yangi buyurtmalar yuklanmoqda...")
    orders = await fetch_orders(status="new", limit=10)

    if not orders:
        await msg.answer("✅ Yangi buyurtmalar yo'q")
        return

    await msg.answer(f"📦 <b>Yangi buyurtmalar: {len(orders)} ta</b>")
    for o in orders:
        try:
            await msg.answer(fmt_order(o), reply_markup=order_kb(o["id"], o["status"]))
        except Exception as e:
            log.error(f"Order #{o.get('id')} xato: {e}")


@router.message(Command("processing"))
async def list_processing(msg: Message, state: FSMContext):
    role = await get_role_cached(state, str(msg.from_user.id))
    if role not in ("admin", "operator", "seller"):
        await msg.answer(t("no_permission", "uz"))
        return

    orders = await fetch_orders(status="processing", limit=10)
    if not orders:
        await msg.answer("✅ Jarayondagi buyurtmalar yo'q")
        return

    await msg.answer(f"⚙️ <b>Jarayondagi buyurtmalar: {len(orders)} ta</b>")
    for o in orders:
        try:
            await msg.answer(fmt_order(o), reply_markup=order_kb(o["id"], o["status"]))
        except Exception as e:
            log.error(f"Order #{o.get('id')} xato: {e}")


@router.message(Command("shipped"))
async def list_shipped(msg: Message, state: FSMContext):
    role = await get_role_cached(state, str(msg.from_user.id))
    if role not in ("admin", "operator", "seller"):
        await msg.answer(t("no_permission", "uz"))
        return

    orders = await fetch_orders(status="shipped", limit=10)
    if not orders:
        await msg.answer("✅ Yo'ldagi buyurtmalar yo'q")
        return

    await msg.answer(f"🚚 <b>Yo'ldagi buyurtmalar: {len(orders)} ta</b>")
    for o in orders:
        try:
            await msg.answer(fmt_order(o), reply_markup=order_kb(o["id"], o["status"]))
        except Exception as e:
            log.error(f"Order #{o.get('id')} xato: {e}")


@router.callback_query(F.data.startswith("ord:"))
async def change_status(cb: CallbackQuery, state: FSMContext):
    role = await get_role_cached(state, str(cb.from_user.id))
    if role not in ("admin", "operator", "seller"):
        await cb.answer(t("no_permission", "uz"), show_alert=True)
        return

    parts = cb.data.split(":")
    if len(parts) != 3:
        await cb.answer("❌ Noto'g'ri format", show_alert=True)
        return

    _, order_id, new_status = parts
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.patch(
                f"{settings.API_URL}/orders/{order_id}/status",
                params={"new_status": new_status, "operator_id": cb.from_user.id}
            )
        if r.status_code == 200:
            label = STATUS_LABELS.get(new_status, new_status)
            try:
                old_text = cb.message.html_text or cb.message.text or ""
                await cb.message.edit_text(
                    old_text + f"\n\n✅ <b>Yangilandi:</b> {label}",
                    reply_markup=order_kb(int(order_id), new_status),
                    parse_mode="HTML",
                )
            except Exception as edit_err:
                log.debug(f"edit_text xato (OK): {edit_err}")
            await cb.answer(f"✅ {label}")
        else:
            detail = r.json().get("detail", r.status_code)
            await cb.answer(f"❌ Xato: {detail}", show_alert=True)
    except Exception as e:
        log.error(f"change_status xato: {e}")
        await cb.answer("❌ Server xatosi", show_alert=True)


@router.message(Command("stats"))
async def stats_cmd(msg: Message, state: FSMContext):
    role = await get_role_cached(state, str(msg.from_user.id))
    if role not in ("admin", "operator"):
        await msg.answer("❌ Faqat admin va operatorlar uchun")
        return

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(f"{settings.API_URL}/orders/stats")
        if r.status_code != 200:
            await msg.answer("❌ Statistika olishda xato")
            return
        s = r.json()
        await msg.answer(
            f"📊 <b>Statistika</b>\n"
            f"━━━━━━━━━━━━━━━\n"
            f"🆕 Yangi: <b>{s.get('new_orders', 0)}</b>\n"
            f"⚙️ Jarayonda: <b>{s.get('processing', 0)}</b>\n"
            f"📦 Bugungi: <b>{s.get('daily_orders', 0)}</b>\n"
            f"📅 Oylik: <b>{s.get('monthly_orders', 0)}</b>\n"
            f"💰 Bugungi daromad: <b>{fmt_money(s.get('daily_revenue', 0))} so'm</b>\n"
            f"📈 Oylik daromad: <b>{fmt_money(s.get('monthly_revenue', 0))} so'm</b>\n"
            f"👥 Mijozlar: <b>{s.get('customers_total', 0)}</b>\n"
            f"👗 Mahsulotlar: <b>{s.get('products_total', 0)}</b>"
        )
    except Exception as e:
        log.error(f"stats xato: {e}")
        await msg.answer("❌ Statistika olishda xato")


@router.message(Command("dashboard"))
async def dashboard_cmd(msg: Message, state: FSMContext):
    """Operator uchun tezkor dashboard."""
    role = await get_role_cached(state, str(msg.from_user.id))
    if role not in ("admin", "operator"):
        await msg.answer(t("no_permission", "uz"))
        return

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            stats_r = await client.get(f"{settings.API_URL}/orders/stats")
            new_r = await client.get(
                f"{settings.API_URL}/orders/", params={"status": "new", "limit": 3}
            )

        s = stats_r.json() if stats_r.status_code == 200 else {}
        new_orders = new_r.json().get("items", []) if new_r.status_code == 200 else []

        text = (
            f"🏪 <b>Mixart Dashboard</b>\n"
            f"━━━━━━━━━━━━━━━\n"
            f"🆕 Yangi buyurtmalar: <b>{s.get('new_orders', 0)}</b>\n"
            f"⚙️ Jarayonda: <b>{s.get('processing', 0)}</b>\n"
            f"🚚 Yo'lda: <b>{s.get('shipped', 0)}</b>\n"
            f"💰 Bugungi daromad: <b>{fmt_money(s.get('daily_revenue', 0))} so'm</b>\n"
        )

        if new_orders:
            text += f"\n📦 <b>Oxirgi yangi buyurtmalar:</b>\n"
            for o in new_orders:
                text += f"  #{o['id']} — {o.get('customer_name', '—')} — {fmt_money(o.get('final_amount', 0))} so'm\n"

        builder = InlineKeyboardBuilder()
        builder.button(text="📋 Yangi buyurtmalar", callback_data="dash:new")
        builder.button(text="🔄 Yangilash", callback_data="dash:refresh")
        builder.adjust(2)

        await msg.answer(text, reply_markup=builder.as_markup())
    except Exception as e:
        log.error(f"dashboard xato: {e}")
        await msg.answer("❌ Dashboard yuklanmadi")


@router.message(Command("myreport"))
async def my_report(msg: Message, state: FSMContext):
    """Seller/operator o'z filiali hisobotini ko'radi."""
    role = await get_role_cached(state, str(msg.from_user.id))
    if role not in ("admin", "operator", "seller"):
        await msg.answer(t("no_permission", "uz"))
        return

    data = await state.get_data()
    token = data.get("token", "")

    await msg.answer("⏳ Hisobot tayyorlanmoqda...")

    try:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            me_r = await client.get(f"{settings.API_URL}/auth/me", headers=headers)
            if me_r.status_code != 200:
                await msg.answer("❌ Autentifikatsiya xatosi. /start bosing.")
                return

            me = me_r.json()
            branch_id = me.get("branch_id")

            params = {"period": "month"}
            if branch_id:
                params["branch_id"] = branch_id

            rep_r = await client.get(f"{settings.API_URL}/reports/summary", params=params)

        if rep_r.status_code != 200:
            await msg.answer("❌ Hisobot olishda xato")
            return

        s = rep_r.json()
        branch_line = f"🏪 Filial: <b>{s.get('branch_name', 'Barcha filiallar')}</b>\n" if branch_id else ""

        by_st = s.get("by_status", {})
        top = s.get("top_products", [])
        top_text = ""
        if top:
            top_text = "\n\n📦 <b>Top mahsulotlar:</b>\n"
            for i, p in enumerate(top, 1):
                top_text += f"  {i}. {p['name']} — {p['qty']} ta\n"

        await msg.answer(
            f"📊 <b>Oylik hisobot</b>\n"
            f"━━━━━━━━━━━━━━━\n"
            f"{branch_line}"
            f"📦 Jami buyurtmalar: <b>{s.get('total_orders', 0)}</b>\n"
            f"💰 Jami summa: <b>{fmt_money(s.get('total_revenue', 0))} so'm</b>\n"
            f"✅ To'langan: <b>{fmt_money(s.get('paid_revenue', 0))} so'm</b>\n"
            f"━━━━━━━━━━━━━━━\n"
            f"🆕 Yangi: {by_st.get('new', 0)}  "
            f"⚙️ Jarayonda: {by_st.get('processing', 0)}  "
            f"🚚 Yo'lda: {by_st.get('shipped', 0)}\n"
            f"✅ Yetkazildi: {by_st.get('delivered', 0)}  "
            f"❌ Bekor: {by_st.get('cancelled', 0)}"
            f"{top_text}"
        )

    except Exception as e:
        log.error(f"myreport xato: {e}")
        await msg.answer("❌ Hisobot olishda xato yuz berdi.")


@router.message(Command("ai"))
async def ai_reply_helper(msg: Message, state: FSMContext):
    """Operator mijoz savoliga AI javob oladi. Ishlatish: /ai [mijoz savoli yoki xabari]"""
    role = await get_role_cached(state, str(msg.from_user.id))
    if role not in ("admin", "operator"):
        return

    args = msg.text.split(maxsplit=1)
    if len(args) < 2 or not args[1].strip():
        await msg.answer(
            "💡 <b>AI javob yordamchisi</b>\n\n"
            "Ishlatish: <code>/ai [mijoz savoli]</code>\n\n"
            "Misol: <code>/ai Kechagi buyurtmam qachon yetib keladi?</code>",
            parse_mode="HTML"
        )
        return

    customer_text = args[1].strip()
    await msg.answer("✨ AI javob yozmoqda...")

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
            resp = await client.post(
                f"{settings.API_URL}/ai/chat",
                json={"message": customer_text, "user_id": f"op_{msg.from_user.id}", "role": "customer"}
            )
        if resp.status_code == 200:
            ai_text = resp.json().get("text", "")
            await msg.answer(
                f"✨ <b>AI taklif qilgan javob:</b>\n\n{ai_text}\n\n"
                f"<i>📋 Ushbu matnni nusxalab tahrirlashingiz mumkin</i>",
                parse_mode="HTML"
            )
        else:
            await msg.answer("❌ AI javob bera olmadi, keyinroq urinib ko'ring")
    except Exception as e:
        log.error(f"ai_reply_helper xato: {e}")
        await msg.answer("❌ AI xizmat bilan bog'lanishda xato yuz berdi")


@router.callback_query(F.data.startswith("dash:"))
async def dashboard_action(cb: CallbackQuery, state: FSMContext):
    role = await get_role_cached(state, str(cb.from_user.id))
    if role not in ("admin", "operator"):
        await cb.answer(t("no_permission", "uz"), show_alert=True)
        return

    action = cb.data.split(":")[1]
    await cb.answer()

    if action in ("new", "refresh"):
        orders = await fetch_orders(status="new", limit=5)
        if not orders:
            await cb.message.answer("✅ Yangi buyurtmalar yo'q")
        else:
            await cb.message.answer(f"📦 <b>Yangi buyurtmalar: {len(orders)} ta</b>")
            for o in orders:
                await cb.message.answer(fmt_order(o), reply_markup=order_kb(o["id"], o["status"]))


# ── Reply keyboard tugmalar ───────────────────────────────────────────────────
@router.message(F.text == "📋 Yangi buyurtmalar")
async def btn_new_orders(msg: Message, state: FSMContext):
    await list_orders(msg, state)

@router.message(F.text == "⚙️ Jarayondagi")
async def btn_processing(msg: Message, state: FSMContext):
    await list_processing(msg, state)

@router.message(F.text == "🚚 Yo'ldagi")
async def btn_shipped(msg: Message, state: FSMContext):
    await list_shipped(msg, state)

@router.message(F.text == "📊 Statistika")
async def btn_stats(msg: Message, state: FSMContext):
    await stats_cmd(msg, state)

@router.message(F.text == "📈 Hisobot")
async def btn_report(msg: Message, state: FSMContext):
    await my_report(msg, state)

@router.message(F.text == "🖥 Dashboard")
async def btn_dashboard(msg: Message, state: FSMContext):
    await dashboard_cmd(msg, state)
