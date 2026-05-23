"""
Mixart Bot - main entry point.

- Aiogram 3 bilan polling
- NotificationWorker - xabarlarni yuboradi
- MemoryStorage (Redis ixtiyoriy)
"""
import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.storage.memory import MemoryStorage

from config import settings
from handlers import customer, operator, admin
from notification_worker import NotificationWorker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


async def setup_storage():
    """Redis bo'lsa undan, bo'lmasa MemoryStorage."""
    try:
        from aiogram.fsm.storage.redis import RedisStorage
        storage = RedisStorage.from_url(settings.REDIS_URL)
        # Ulanishni tekshirish
        await storage.redis.ping()
        logger.info(f"✅ RedisStorage: {settings.REDIS_URL}")
        return storage
    except Exception as e:
        logger.warning(f"⚠️  Redis ishlamayapti ({e}), MemoryStorage ishlatilmoqda")
        return MemoryStorage()


async def main():
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.error("❌ TELEGRAM_BOT_TOKEN belgilanmagan!")
        sys.exit(1)

    bot = Bot(
        token=settings.TELEGRAM_BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )

    storage = await setup_storage()
    dp = Dispatcher(storage=storage)

    # Routerlar
    dp.include_router(admin.router)
    dp.include_router(operator.router)
    dp.include_router(customer.router)

    # Bot ma'lumoti
    bot_info = await bot.get_me()
    logger.info(f"🤖 Bot ishga tushdi: @{bot_info.username} ({bot_info.full_name})")
    logger.info(f"🔗 API URL: {settings.API_URL}")
    logger.info(f"🌐 TWA URL: {settings.TWA_URL}")

    # Notification worker — alohida task da
    worker = NotificationWorker(
        bot=bot,
        api_url=settings.API_URL,
        poll_interval=10,
        rate_limit_delay=0.2,
    )
    worker_task = asyncio.create_task(worker.run(), name="notification_worker")
    logger.info("📨 NotificationWorker boshlandi")

    try:
        await dp.start_polling(
            bot,
            allowed_updates=["message", "callback_query", "inline_query"]
        )
    finally:
        # To'xtatishda worker ni ham yopish
        worker.stop()
        try:
            await asyncio.wait_for(worker_task, timeout=5)
        except asyncio.TimeoutError:
            worker_task.cancel()
        await bot.session.close()
        logger.info("👋 Bot to'xtatildi")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Ctrl+C - to'xtatilmoqda...")
