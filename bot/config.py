from pydantic_settings import BaseSettings
import os

class BotSettings(BaseSettings):
    TELEGRAM_BOT_TOKEN: str = ""

    # Docker da: http://backend:8000/api/v1
    # Windows local da: http://localhost:8000/api/v1
    API_URL: str = "http://localhost:8000/api/v1"

    # Docker da: redis://redis:6379/0
    # Windows local da ishlatilmaydi (MemoryStorage)
    REDIS_URL: str = "redis://localhost:6379/0"

    TWA_URL: str = "https://yourdomain.com/twa"
    ADMIN_IDS: list = []

    class Config:
        # .env faylni bir necha joyda qidiradi
        env_file = (
            "../.env.windows",   # mixart/.env.windows  ← Windows
            ".env",              # bot/.env
            "../backend/.env",   # mixart/backend/.env
            "../.env",           # mixart/.env
        )
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = BotSettings()
