@echo off
chcp 65001 > nul
echo.
echo  ================================
echo   Mixart Fashion — Windows Setup
echo  ================================
echo.

:: Python tekshiruv
python --version > nul 2>&1
if errorlevel 1 (
    echo [XATO] Python topilmadi! https://python.org dan yuklab oling.
    pause & exit /b 1
)
echo [OK] Python topildi

:: Virtual environment
if not exist "venv" (
    echo [INFO] Virtual muhit yaratilmoqda...
    python -m venv venv
)
call venv\Scripts\activate.bat

:: Backend kutubxonalar
echo [INFO] Backend kutubxonalar o'rnatilmoqda...
pip install -q ^
    fastapi uvicorn[standard] sqlalchemy alembic ^
    python-jose[cryptography] passlib[bcrypt] ^
    python-multipart aiofiles pydantic-settings ^
    openpyxl reportlab httpx python-dotenv ^
    google-genai aiosmtplib jinja2 requests ^
    pytest pytest-asyncio

:: Bot kutubxonalar
echo [INFO] Bot kutubxonalar o'rnatilmoqda...
pip install -q aiogram httpx python-dotenv pydantic-settings redis

echo.
echo [OK] Barcha kutubxonalar o'rnatildi!

:: .env fayl
if not exist "backend\.env" (
    echo [INFO] .env fayl yaratilmoqda...
    copy .env.windows backend\.env > nul
    echo [DIQQAT] backend\.env faylini oching va TELEGRAM_BOT_TOKEN ni kiriting!
)

:: Seed
echo.
echo [INFO] Database va boshlangich malumotlar yaratilmoqda...
cd backend
python seed.py
cd ..

echo.
echo  ================================
echo   O'rnatish tugadi!
echo  ================================
echo.
echo  Ishga tushirish:
echo    python run.py
echo.
echo  Faqat API:
echo    python run.py --only-api
echo.
echo  Admin panel:
echo    http://localhost:8000/admin
echo.
echo  API docs:
echo    http://localhost:8000/docs
echo.
pause
