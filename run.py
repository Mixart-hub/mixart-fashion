"""
run.py — Mixart Fashion
========================
FastAPI backend va Telegram bot ni BITTA terminalda ishga tushiradi.

Ishlatish:
    python run.py              # backend + bot
    python run.py --only-api   # faqat backend
    python run.py --only-bot   # faqat bot
    python run.py --seed       # DB ga boshlang'ich ma'lumot yozib, chiqish
"""

import asyncio
import sys
import os
import argparse
import threading
import logging

# ============================================================
# 0. PATH va .env — ENG BIRINCHI, boshqa hech narsadan oldin
# ============================================================
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
BOT_DIR     = os.path.join(BASE_DIR, "bot")

for p in [BASE_DIR, BACKEND_DIR, BOT_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)


def _load_env():
    """
    .env faylni quyidagi joylarda qidiradi (tartibda):
      1. mixart/.env.windows
      2. mixart/backend/.env
      3. mixart/.env
    """
    candidates = [
        os.path.join(BASE_DIR,    ".env.windows"),
        os.path.join(BACKEND_DIR, ".env"),
        os.path.join(BASE_DIR,    ".env"),
    ]
    loaded_path = None
    for path in candidates:
        if os.path.exists(path):
            loaded_path = path
            break

    if not loaded_path:
        print("[WARNING] Hech qanday .env fayl topilmadi!")
        print("  Quyidagilardan birini yarating:")
        for c in candidates:
            print(f"    {c}")
        return

    # python-dotenv bilan yuklash
    try:
        from dotenv import load_dotenv
        load_dotenv(loaded_path, override=True)
        print(f"[INFO] .env yuklandi: {loaded_path}")
    except ImportError:
        # python-dotenv yo'q — qo'lda parse
        print("[INFO] python-dotenv yo'q, qo'lda parse qilinmoqda...")
        with open(loaded_path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key:
                    os.environ[key] = val
        print(f"[INFO] .env qo'lda yuklandi: {loaded_path}")


_load_env()  # <── BOSHQA HECH NARSADAN OLDIN

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)-8s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(BASE_DIR, "mixart.log"), encoding="utf-8"),
    ],
)
log = logging.getLogger("mixart.runner")

token_status = "SET ✅" if ":" in os.getenv("TELEGRAM_BOT_TOKEN", "") else "YOQ ❌"

# Docker URL ni localhost ga almashtiramiz (Windows uchun)
_api_url = os.getenv("API_URL", "http://localhost:8000/api/v1")
if "backend:" in _api_url or "redis:" in _api_url.replace("API_URL",""):
    _api_url = "http://localhost:8000/api/v1"
os.environ["API_URL"] = _api_url

_redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
if "redis:6379" in _redis_url and "redis://redis:" in _redis_url:
    _redis_url = "redis://localhost:6379/0"
os.environ["REDIS_URL"] = _redis_url

log.info(f"BASE_DIR          : {BASE_DIR}")
log.info(f"BACKEND_DIR       : {BACKEND_DIR}")
log.info(f"DATABASE_URL      : {os.getenv('DATABASE_URL', 'topilmadi')}")
log.info(f"API_URL           : {os.environ['API_URL']}")
log.info(f"TELEGRAM_BOT_TOKEN: {token_status}")

os.chdir(BACKEND_DIR)  # working dir = backend


# ============================================================
# 1. BACKEND  (uvicorn + FastAPI)
# ============================================================
def run_backend(port=8000):
    """Uvicorn ni alohida daemon threadda ishga tushiradi."""
    import uvicorn
    log.info(f"Backend ishga tushmoqda → http://localhost:{port}")
    log.info(f"  API Docs : http://localhost:{port}/docs")
    log.info(f"  Admin    : http://localhost:{port}/admin")
    log.info(f"  TWA      : http://localhost:{port}/twa")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="warning",
        access_log=True,
    )


# ============================================================
# 2. TELEGRAM BOT  (aiogram 3)
# ============================================================
async def run_bot():
    """aiogram botni async sifatida ishga tushiradi."""
    os.chdir(BOT_DIR)
    if BOT_DIR not in sys.path:
        sys.path.insert(0, BOT_DIR)

    try:
        from aiogram import Bot, Dispatcher
        from aiogram.enums import ParseMode
        from aiogram.client.default import DefaultBotProperties
        from aiogram.fsm.storage.memory import MemoryStorage
    except ImportError:
        log.error("aiogram o'rnatilmagan!  →  pip install aiogram")
        os.chdir(BACKEND_DIR)
        return

    # Token: avval env dan, keyin bot/config.py dan
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token:
        try:
            from config import settings as bot_cfg
            token = bot_cfg.TELEGRAM_BOT_TOKEN
        except Exception:
            pass

    if not token or ":" not in token or len(token) < 30:
        log.warning("TELEGRAM_BOT_TOKEN topilmadi yoki noto'g'ri.")
        log.warning("  .env.windows faylida: TELEGRAM_BOT_TOKEN=<tokeningiz>")
        log.warning("  Backend yolg'iz davom etadi.")
        os.chdir(BACKEND_DIR)
        return

    bot = Bot(
        token=token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher(storage=MemoryStorage())

    try:
        from handlers import customer, operator, admin
        dp.include_router(admin.router)
        dp.include_router(operator.router)
        dp.include_router(customer.router)
        log.info("Bot handlerlari ulandi: admin, operator, customer")
    except ImportError as e:
        log.error(f"Bot handlerlari yuklanmadi: {e}")
        await bot.session.close()
        os.chdir(BACKEND_DIR)
        return

    try:
        info = await bot.get_me()
        log.info(f"Bot ishga tushdi → @{info.username}  ({info.first_name})")
        await dp.start_polling(
            bot,
            allowed_updates=["message", "callback_query"],
            handle_signals=False,   # Windows da signal muammosi
        )
    except Exception as e:
        log.error(f"Bot xatosi: {e}")
    finally:
        await bot.session.close()
        os.chdir(BACKEND_DIR)


# ============================================================
# 3. SEED
# ============================================================
def run_seed():
    os.chdir(BACKEND_DIR)
    log.info("Seed ishga tushmoqda...")
    try:
        import seed as seed_module
        seed_module.seed()
        log.info("Seed muvaffaqiyatli yakunlandi!")
    except Exception as e:
        log.error(f"Seed xatosi: {e}")


# ============================================================
# 4. ASOSIY FUNKSIYA
# ============================================================
async def _bot_with_delay():
    """Backend tayyor bo'lguncha 2s kutib botni ishga tushiradi."""
    log.info("Bot 2 soniya kutmoqda (backend yuklansin)...")
    await asyncio.sleep(2)
    await run_bot()


def parse_args():
    p = argparse.ArgumentParser(description="Mixart Fashion — Backend + Bot runner")
    p.add_argument("--only-api", action="store_true")
    p.add_argument("--only-bot", action="store_true")
    p.add_argument("--seed",     action="store_true")
    p.add_argument("--port",     type=int, default=8000)
    return p.parse_args()


def main():
    args = parse_args()

    print("\n" + "=" * 54)
    print("   MIXART FASHION  —  Windows Local Runner")
    print("=" * 54)
    print(f"  Backend : http://localhost:{args.port}")
    print(f"  Docs    : http://localhost:{args.port}/docs")
    print(f"  Admin   : http://localhost:{args.port}/admin")
    print(f"  Log     : {os.path.join(BASE_DIR, 'mixart.log')}")
    print("=" * 54 + "\n")

    if args.seed:
        run_seed()
        return

    if args.only_api:
        run_backend(args.port)   # blocking
        return

    if args.only_bot:
        asyncio.run(run_bot())
        return

    # Backend + Bot birga
    api_thread = threading.Thread(
        target=run_backend, args=(args.port,), daemon=True, name="uvicorn"
    )
    api_thread.start()

    try:
        asyncio.run(_bot_with_delay())
    except KeyboardInterrupt:
        log.info("Ctrl+C — dastur to'xtatildi.")
    except Exception as e:
        log.error(f"Kutilmagan xato: {e}")
    finally:
        log.info("Mixart Fashion o'chirildi.")


if __name__ == "__main__":
    main()
