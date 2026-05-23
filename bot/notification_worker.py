"""
Notification Worker - bazadagi yuborilmagan xabarlarni Telegram orqali yuboradi.

Doimiy ishlayapti, har 10 soniyada navbatdagilarni tekshiradi va yuboradi.
Backend `/notifications/pending` endpointidan oladi va `/notifications/{id}/sent` ga belgilab qo'yadi.

Telegram rate limit: bittada ~30 msg/sec maksimum, lekin xavfsiz - 5 msg/sec.
"""
import asyncio
import logging
from typing import Optional
import httpx
from aiogram import Bot
from aiogram.exceptions import TelegramRetryAfter, TelegramForbiddenError, TelegramBadRequest

log = logging.getLogger(__name__)


class NotificationWorker:
    def __init__(
        self,
        bot: Bot,
        api_url: str,
        poll_interval: int = 10,
        rate_limit_delay: float = 0.2,  # 5 msg/sec
        batch_size: int = 30,
    ):
        self.bot = bot
        self.api_url = api_url.rstrip("/")
        self.poll_interval = poll_interval
        self.rate_limit_delay = rate_limit_delay
        self.batch_size = batch_size
        self._running = False
        self._client: Optional[httpx.AsyncClient] = None

    async def fetch_pending(self):
        """Yuborilmagan xabarlarni olish."""
        try:
            r = await self._client.get(
                f"{self.api_url}/notifications/pending",
                params={"limit": self.batch_size}
            )
            if r.status_code == 200:
                return r.json()
            log.warning(f"fetch_pending status: {r.status_code}")
        except Exception as e:
            log.error(f"fetch_pending xato: {e}")
        return []

    async def mark_sent(self, notif_id: int):
        """Yuborilgan deb belgilash."""
        try:
            await self._client.patch(f"{self.api_url}/notifications/{notif_id}/sent")
        except Exception as e:
            log.error(f"mark_sent({notif_id}) xato: {e}")

    async def mark_failed(self, notif_id: int, reason: str = ""):
        """Xato deb belgilash (failed_count oshadi)."""
        try:
            await self._client.patch(
                f"{self.api_url}/notifications/{notif_id}/failed",
                json={"reason": reason}
            )
        except Exception as e:
            log.error(f"mark_failed({notif_id}) xato: {e}")

    async def send_one(self, notif: dict) -> bool:
        """Bitta xabarni yuborish. True qaytarsa - muvaffaqiyatli."""
        notif_id = notif["id"]
        tg_id = notif.get("telegram_id")
        body = notif.get("body", "")
        title = notif.get("title", "")

        if not tg_id:
            log.warning(f"#{notif_id}: telegram_id yo'q")
            await self.mark_failed(notif_id, "telegram_id yo'q")
            return False

        # Title bo'lsa qo'shish
        text = body
        if title:
            text = f"<b>{title}</b>\n\n{body}"

        try:
            await self.bot.send_message(
                chat_id=int(tg_id),
                text=text,
                parse_mode="HTML",
                disable_web_page_preview=True,
            )
            await self.mark_sent(notif_id)
            log.info(f"✅ Sent #{notif_id} -> {tg_id}")
            return True

        except TelegramRetryAfter as e:
            # Telegram tezlik chegarasi
            log.warning(f"Rate limit, kutamiz {e.retry_after}s")
            await asyncio.sleep(e.retry_after)
            # Qayta urinish
            try:
                await self.bot.send_message(
                    chat_id=int(tg_id), text=text, parse_mode="HTML"
                )
                await self.mark_sent(notif_id)
                return True
            except Exception as e2:
                await self.mark_failed(notif_id, f"retry failed: {e2}")
                return False

        except TelegramForbiddenError:
            # Foydalanuvchi botni bloklab qo'ygan - qayta urinmaymiz
            log.info(f"#{notif_id}: foydalanuvchi botni bloklab qo'ygan")
            await self.mark_failed(notif_id, "user blocked bot")
            return False

        except TelegramBadRequest as e:
            log.warning(f"#{notif_id} bad request: {e}")
            await self.mark_failed(notif_id, f"bad request: {e}")
            return False

        except Exception as e:
            log.error(f"#{notif_id} xato: {e}")
            await self.mark_failed(notif_id, str(e))
            return False

    async def run(self):
        """Asosiy loop."""
        self._running = True
        self._client = httpx.AsyncClient(timeout=15)
        log.info(f"📨 NotificationWorker started (poll: {self.poll_interval}s)")

        try:
            while self._running:
                try:
                    pending = await self.fetch_pending()
                    if pending:
                        log.info(f"Yuborilmoqda: {len(pending)} ta xabar")
                        for notif in pending:
                            await self.send_one(notif)
                            # Rate limit
                            await asyncio.sleep(self.rate_limit_delay)
                except Exception as e:
                    log.error(f"Worker loop xato: {e}")

                # Keyingi tekshirish
                await asyncio.sleep(self.poll_interval)
        finally:
            await self._client.aclose()
            log.info("📭 NotificationWorker stopped")

    def stop(self):
        self._running = False
