"""
Bu scriptni bir marta ishga tushiring — eski bot menu tugmalarini o'chiradi.
Ishlatish: python fix_bot_menu.py
"""
import asyncio, os, sys

# .env ni yuklab olish
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
for env_file in [
    os.path.join(BASE_DIR, ".env.windows"),
    os.path.join(BASE_DIR, "backend", ".env"),
    os.path.join(BASE_DIR, ".env"),
]:
    if os.path.exists(env_file):
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        print(f"[OK] .env yuklandi: {env_file}")
        break

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
if not TOKEN or ":" not in TOKEN:
    print("[XATO] TELEGRAM_BOT_TOKEN topilmadi!")
    sys.exit(1)

async def fix():
    from aiogram import Bot
    from aiogram.types import BotCommand, MenuButtonDefault, ReplyKeyboardRemove

    bot = Bot(token=TOKEN)
    info = await bot.get_me()
    print(f"[OK] Bot: @{info.username}")

    # 1. Barcha commandlarni o'chirish
    await bot.delete_my_commands()
    print("[OK] Barcha /commands o'chirildi")

    # 2. Menu tugmasini default ga qaytarish (hamburger menu)
    await bot.set_chat_menu_button(menu_button=MenuButtonDefault())
    print("[OK] Menu button default ga qaytarildi")

    # 3. Faqat /start commandini qoldirish
    await bot.set_my_commands([
        BotCommand(command="start",  description="Botni boshlash"),
        BotCommand(command="lang",   description="Tilni o'zgartirish"),
        BotCommand(command="orders", description="Buyurtmalar (operator)"),
        BotCommand(command="stats",  description="Statistika (operator)"),
        BotCommand(command="admin",  description="Admin panel"),
    ])
    print("[OK] Yangi commandlar o'rnatildi")

    await bot.session.close()
    print("\nTayyor! Botni qayta oching — ortiqcha tugmalar yo'qoladi.")

asyncio.run(fix())
