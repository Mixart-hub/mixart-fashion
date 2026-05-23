"""
SMS notification service — Eskiz.uz (O'zbekiston)
Fallback: log only
"""
import os
import logging
import httpx
from typing import Optional

log = logging.getLogger(__name__)

ESKIZ_EMAIL = os.getenv("ESKIZ_EMAIL", "")
ESKIZ_PASSWORD = os.getenv("ESKIZ_PASSWORD", "")
ESKIZ_BASE = "https://notify.eskiz.uz/api"
ESKIZ_FROM = os.getenv("ESKIZ_FROM", "4546")

_token_cache: dict = {"token": "", "expires": 0}


async def _get_token() -> str:
    import time
    if _token_cache["token"] and _token_cache["expires"] > time.time():
        return _token_cache["token"]
    if not ESKIZ_EMAIL or not ESKIZ_PASSWORD:
        return ""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{ESKIZ_BASE}/auth/login",
                data={"email": ESKIZ_EMAIL, "password": ESKIZ_PASSWORD},
            )
            if r.status_code == 200:
                data = r.json()
                token = data.get("data", {}).get("token", "")
                _token_cache["token"] = token
                _token_cache["expires"] = time.time() + 3600 * 23
                return token
    except Exception as e:
        log.warning(f"Eskiz auth error: {e}")
    return ""


async def send_sms(phone: str, message: str) -> bool:
    """Telefon raqamga SMS yuborish. True - muvaffaqiyatli."""
    clean = phone.strip().replace("+", "").replace(" ", "").replace("-", "")
    if not clean:
        return False

    log.info(f"SMS → {phone}: {message[:50]}...")

    token = await _get_token()
    if not token:
        log.warning("Eskiz token yo'q — SMS yuborilmadi (config ESKIZ_EMAIL/PASSWORD)")
        return False

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{ESKIZ_BASE}/message/sms/send",
                headers={"Authorization": f"Bearer {token}"},
                data={
                    "mobile_phone": clean,
                    "message": message,
                    "from": ESKIZ_FROM,
                    "callback_url": "",
                },
            )
            if r.status_code == 200:
                result = r.json()
                if result.get("status") == "waiting":
                    log.info(f"SMS yuborildi: {phone}")
                    return True
            log.warning(f"SMS xato: {r.status_code} {r.text[:200]}")
    except Exception as e:
        log.error(f"SMS exception: {e}")
    return False


def send_sms_sync(phone: str, message: str) -> bool:
    """Synchronous wrapper for non-async contexts."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, send_sms(phone, message))
                return future.result(timeout=20)
        return loop.run_until_complete(send_sms(phone, message))
    except Exception as e:
        log.error(f"send_sms_sync error: {e}")
        return False


ORDER_SMS = {
    "uz": {
        "new": "Mixart: Buyurtmangiz #{id} qabul qilindi. Jami: {amount} so'm. Rahmat!",
        "processing": "Mixart: #{id} buyurtmangiz tayyorlanmoqda.",
        "shipped": "Mixart: #{id} buyurtmangiz yo'lga chiqdi! Yaqin orada yetadi.",
        "delivered": "Mixart: #{id} buyurtmangiz yetkazildi. Xarid uchun rahmat!",
        "cancelled": "Mixart: #{id} buyurtmangiz bekor qilindi.",
    },
    "ru": {
        "new": "Mixart: Ваш заказ #{id} принят. Сумма: {amount} сум. Спасибо!",
        "processing": "Mixart: Заказ #{id} готовится.",
        "shipped": "Mixart: Заказ #{id} отправлен! Скоро будет у вас.",
        "delivered": "Mixart: Заказ #{id} доставлен. Спасибо за покупку!",
        "cancelled": "Mixart: Заказ #{id} отменён.",
    },
}


async def send_order_sms(phone: str, order_id: int, status: str, amount: float, lang: str = "uz") -> bool:
    templates = ORDER_SMS.get(lang, ORDER_SMS["uz"])
    template = templates.get(status, "")
    if not template:
        return False
    msg = template.format(id=order_id, amount=f"{int(amount):,}".replace(",", " "))
    return await send_sms(phone, msg)
