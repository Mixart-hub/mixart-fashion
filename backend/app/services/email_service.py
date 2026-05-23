"""
Email notification service — SMTP
O'zbek, Rus, Ingliz tillarida email yuborish
"""
import os
import logging
import asyncio
from typing import Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

log = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Mixart Fashion")


async def send_email(to: str, subject: str, body_html: str, body_text: str = "") -> bool:
    if not SMTP_USER or not SMTP_PASS:
        log.warning(f"SMTP sozlanmagan — email yuborilmadi: {to}")
        return False
    if not to or "@" not in to:
        return False

    log.info(f"Email → {to}: {subject}")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM}>"
    msg["To"] = to

    if body_text:
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
    msg.attach(MIMEText(body_html, "html", "utf-8"))

    try:
        import aiosmtplib
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASS,
            start_tls=True,
            timeout=20,
        )
        log.info(f"Email yuborildi: {to}")
        return True
    except ImportError:
        log.warning("aiosmtplib o'rnatilmagan. pip install aiosmtplib")
        return False
    except Exception as e:
        log.error(f"Email xato: {e}")
        return False


def _order_email_html(order_id: int, status: str, amount: float, lang: str = "uz") -> tuple:
    STATUS_UZ = {
        "new": ("Buyurtma qabul qilindi", "Buyurtmangiz muvaffaqiyatli qabul qilindi va tez orada tayyorlanadi."),
        "processing": ("Buyurtma tayyorlanmoqda", "Buyurtmangiz tayyorlanmoqda. Tez orada yuboramiz!"),
        "shipped": ("Buyurtma yo'lda", "Buyurtmangiz jo'natildi va yaqin orada sizga yetib boradi."),
        "delivered": ("Buyurtma yetkazildi", "Buyurtmangiz muvaffaqiyatli yetkazildi. Xarid uchun rahmat!"),
        "cancelled": ("Buyurtma bekor qilindi", "Buyurtmangiz bekor qilindi. Savollar uchun biz bilan bog'laning."),
    }
    STATUS_RU = {
        "new": ("Заказ принят", "Ваш заказ успешно принят и скоро будет готов."),
        "processing": ("Заказ готовится", "Ваш заказ готовится. Скоро отправим!"),
        "shipped": ("Заказ в пути", "Ваш заказ отправлен и скоро будет у вас."),
        "delivered": ("Заказ доставлен", "Ваш заказ успешно доставлен. Спасибо за покупку!"),
        "cancelled": ("Заказ отменён", "Ваш заказ отменён. Свяжитесь с нами по вопросам."),
    }

    statuses = STATUS_RU if lang == "ru" else STATUS_UZ
    title, description = statuses.get(status, ("Buyurtma yangilandi", "Buyurtmangiz holati o'zgardi."))
    subject = f"Mixart Fashion — #{order_id}: {title}"
    amt = f"{int(amount):,}".replace(",", " ")

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f5f7;margin:0;padding:20px}}
.card{{max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(45,16,32,.1)}}
.header{{background:linear-gradient(135deg,#2d1020,#8B3A62);padding:28px 24px;text-align:center}}
.logo{{font-size:22px;font-weight:700;color:#fff;letter-spacing:1px}}
.logo span{{color:#f4c0d1}}
.body{{padding:28px 24px}}
.status-badge{{display:inline-block;background:#fdf0f5;color:#8B3A62;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:600;margin-bottom:16px}}
h2{{color:#2d1020;font-size:18px;margin:0 0 8px}}
p{{color:#7a5568;font-size:13px;line-height:1.6;margin:0 0 16px}}
.info-row{{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0e6ec;font-size:13px}}
.info-row:last-child{{border-bottom:none}}
.info-label{{color:#7a5568}}
.info-value{{color:#2d1020;font-weight:600}}
.btn{{display:block;text-align:center;background:#8B3A62;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin:20px 0 0}}
.footer{{background:#f8f5f7;padding:16px 24px;text-align:center;font-size:11px;color:#b4849a}}
</style></head>
<body>
<div class="card">
  <div class="header">
    <div class="logo">MIX<span>ART</span></div>
    <div style="color:rgba(255,255,255,.7);font-size:11px;margin-top:4px">Fashion Store</div>
  </div>
  <div class="body">
    <div class="status-badge">#{order_id}</div>
    <h2>{title}</h2>
    <p>{description}</p>
    <div class="info-row">
      <span class="info-label">{'Jami' if lang != 'ru' else 'Итого'}</span>
      <span class="info-value">{amt} {'so\'m' if lang != 'ru' else 'сум'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">{'Holat' if lang != 'ru' else 'Статус'}</span>
      <span class="info-value">{title}</span>
    </div>
  </div>
  <div class="footer">
    © 2025 Mixart Fashion &nbsp;|&nbsp; info@mixart.uz
  </div>
</div>
</body></html>"""
    return subject, html


async def send_order_email(email: str, order_id: int, status: str, amount: float, lang: str = "uz") -> bool:
    subject, html = _order_email_html(order_id, status, amount, lang)
    return await send_email(email, subject, html)


async def send_welcome_email(email: str, name: str, lang: str = "uz") -> bool:
    if lang == "ru":
        subject = "Добро пожаловать в Mixart Fashion! 👗"
        body = f"<h2>Привет, {name}!</h2><p>Добро пожаловать в Mixart Fashion. Рады видеть вас!</p>"
    else:
        subject = "Mixart Fashion ga xush kelibsiz! 👗"
        body = f"<h2>Salom, {name}!</h2><p>Mixart Fashion do'koniga xush kelibsiz. Sizni ko'rganimizdan xursandmiz!</p>"
    return await send_email(email, subject, body)
