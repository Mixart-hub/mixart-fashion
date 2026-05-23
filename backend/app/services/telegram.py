"""
Telegram Direct Sender — bot process kerak emas, to'g'ridan-to'g'ri API ga yuboradi.
"""
import asyncio
import json
import logging
import os
import time
import uuid
from datetime import datetime
from typing import Optional

import httpx
from app.core.config import settings

log = logging.getLogger(__name__)

HISTORY_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "broadcast_history.json")
)

# Jonli progress (xotira ichida)
_active_jobs: dict = {}


def _tg_url(method: str) -> str:
    return f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/{method}"


def load_history() -> list:
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return []


def save_history(history: list):
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history[-100:], f, ensure_ascii=False, indent=2, default=str)
    except Exception as e:
        log.error(f"History saqlashda xato: {e}")


def get_job(job_id: str) -> Optional[dict]:
    return _active_jobs.get(job_id)


async def _send_one(
    client: httpx.AsyncClient,
    chat_id: str,
    text: str,
    photo_url: Optional[str] = None,
    button_text: Optional[str] = None,
    button_url: Optional[str] = None,
) -> tuple[bool, str]:
    """Bitta foydalanuvchiga xabar yuborish. (ok, reason)"""
    reply_markup = None
    if button_text and button_url:
        reply_markup = json.dumps({
            "inline_keyboard": [[{"text": button_text, "url": button_url}]]
        })

    try:
        if photo_url and photo_url.startswith("http"):
            data = {
                "chat_id": chat_id,
                "caption": text,
                "photo": photo_url,
                "parse_mode": "HTML",
            }
            if reply_markup:
                data["reply_markup"] = reply_markup
            resp = await client.post(_tg_url("sendPhoto"), data=data, timeout=10)
        else:
            data = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": "true",
            }
            if reply_markup:
                data["reply_markup"] = reply_markup
            resp = await client.post(_tg_url("sendMessage"), data=data, timeout=10)

        if resp.status_code == 200:
            return True, ""

        body = resp.json()
        err = body.get("description", str(resp.status_code))

        # Rate limit
        if resp.status_code == 429:
            retry = int(resp.headers.get("Retry-After", 5))
            await asyncio.sleep(retry)
            return await _send_one(client, chat_id, text, photo_url, button_text, button_url)

        return False, err

    except Exception as e:
        return False, str(e)[:200]


async def run_broadcast(
    job_id: str,
    users: list,          # [{"telegram_id": "...", "full_name": "..."}]
    text: str,
    photo_url: Optional[str] = None,
    button_text: Optional[str] = None,
    button_url: Optional[str] = None,
    delay: float = 0.05,  # 20 msg/sec (Telegram limit: 30/sec)
):
    """Background broadcast — barcha userlarga yuboradi, progressni kuzatadi."""
    if not settings.TELEGRAM_BOT_TOKEN:
        _active_jobs[job_id]["status"] = "error"
        _active_jobs[job_id]["error"] = "TELEGRAM_BOT_TOKEN belgilanmagan!"
        return

    job = _active_jobs[job_id]
    job["status"] = "sending"
    job["started_at"] = datetime.utcnow().isoformat()

    sent = 0
    failed = 0
    blocked = 0
    failed_ids = []

    async with httpx.AsyncClient() as client:
        for i, u in enumerate(users):
            tg_id = str(u.get("telegram_id", "")).strip()
            if not tg_id:
                failed += 1
                continue

            ok, reason = await _send_one(client, tg_id, text, photo_url, button_text, button_url)

            if ok:
                sent += 1
            else:
                if "blocked" in reason.lower() or "deactivated" in reason.lower() or "chat not found" in reason.lower():
                    blocked += 1
                else:
                    failed += 1
                failed_ids.append({"tg_id": tg_id, "reason": reason})

            # Progress yangilash
            job["sent"] = sent
            job["failed"] = failed
            job["blocked"] = blocked
            job["processed"] = i + 1

            await asyncio.sleep(delay)

    job["status"] = "done"
    job["completed_at"] = datetime.utcnow().isoformat()
    job["sent"] = sent
    job["failed"] = failed
    job["blocked"] = blocked

    # Tarixga saqlash
    history = load_history()
    history.append({
        "id": job_id,
        "title": job.get("title", ""),
        "text": job.get("text", "")[:100],
        "target": job.get("target", ""),
        "total": job.get("total", 0),
        "sent": sent,
        "failed": failed,
        "blocked": blocked,
        "created_at": job.get("created_at", ""),
        "completed_at": job["completed_at"],
    })
    save_history(history)
    log.info(f"Broadcast {job_id} tugadi: {sent} yuborildi, {failed} xato, {blocked} bloklangan")


def create_job(title: str, text: str, target: str, total: int) -> str:
    job_id = str(uuid.uuid4())[:8]
    _active_jobs[job_id] = {
        "id": job_id,
        "title": title,
        "text": text,
        "target": target,
        "total": total,
        "sent": 0,
        "failed": 0,
        "blocked": 0,
        "processed": 0,
        "status": "queued",
        "created_at": datetime.utcnow().isoformat(),
        "started_at": None,
        "completed_at": None,
        "error": None,
    }
    return job_id
