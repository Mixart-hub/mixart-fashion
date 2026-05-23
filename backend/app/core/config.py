from pydantic_settings import BaseSettings
from typing import List
import json

class Settings(BaseSettings):
    APP_NAME: str = "Mixart Fashion"
    DEBUG: bool = True   # Windows local uchun True, productionda False qiling
    VERSION: str = "1.0.0"
    MEDIA_DIR: str = "media"

    DATABASE_URL: str = "sqlite:///./mixart.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-this-in-production-must-be-32-chars-min"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_URL: str = ""
    TWA_URL: str = ""

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    CLICK_MERCHANT_ID: str = ""
    CLICK_SERVICE_ID: str = ""
    CLICK_SECRET_KEY: str = ""
    PAYME_MERCHANT_ID: str = ""
    PAYME_SECRET_KEY: str = ""
    PAYME_TEST_MODE: bool = True

    # SMS — Eskiz.uz
    ESKIZ_EMAIL: str = ""
    ESKIZ_PASSWORD: str = ""
    ESKIZ_FROM: str = "4546"

    # Email — SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM_NAME: str = "Mixart Fashion"

    # AI
    GEMINI_API_KEY: str = ""

    # Valyuta kurslari
    USD_TO_UZS: float = 12700.0  # 1 USD = 12700 so'm
    DEFAULT_CURRENCY: str = "UZS"  # UZS yoki USD

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
    ]

    class Config:
        env_file = ".env"

settings = Settings()
