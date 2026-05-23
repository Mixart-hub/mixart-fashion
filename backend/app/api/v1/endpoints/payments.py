"""
To'lov tizimlari integratsiyasi
Click va Payme uchun to'liq webhook handlerlari + payment URL generatsiyasi
"""
import hmac
import hashlib
import base64
import time
import logging
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Order, PaymentStatus, PaymentMethod, PaymeTransaction
from app.core.config import settings

router = APIRouter()
log = logging.getLogger(__name__)


# ─── PAYMENT LINK GENERATSIYA ────────────────────────────────────────────────
@router.post("/create-link")
def create_payment_link(data: dict, db: Session = Depends(get_db)):
    """Payme yoki Click uchun to'lov havolasi yaratish."""
    order_id = data.get("order_id")
    method = data.get("method", "payme")

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Buyurtma topilmadi")
    if order.payment_status == "paid":
        raise HTTPException(400, "Buyurtma allaqachon to'langan")

    amount_tiyin = int(order.final_amount * 100)  # so'm → tiyin

    if method == "payme":
        merchant_id = settings.PAYME_MERCHANT_ID
        if not merchant_id:
            raise HTTPException(503, "Payme sozlanmagan. PAYME_MERCHANT_ID ni .env ga qo'shing.")
        params = f"m={merchant_id};ac.order_id={order_id};a={amount_tiyin};l=uz"
        params_b64 = base64.b64encode(params.encode()).decode()
        base_url = "https://test.paycom.uz" if settings.PAYME_TEST_MODE else "https://checkout.paycom.uz"
        link = f"{base_url}/{params_b64}"
        return {"url": link, "method": "payme", "amount": order.final_amount, "order_id": order_id}

    elif method == "click":
        merchant_id = settings.CLICK_MERCHANT_ID
        service_id = settings.CLICK_SERVICE_ID
        if not merchant_id or not service_id:
            raise HTTPException(503, "Click sozlanmagan. CLICK_MERCHANT_ID va CLICK_SERVICE_ID ni .env ga qo'shing.")
        link = (
            f"https://my.click.uz/services/pay"
            f"?service_id={service_id}"
            f"&merchant_id={merchant_id}"
            f"&amount={order.final_amount}"
            f"&transaction_param={order_id}"
        )
        return {"url": link, "method": "click", "amount": order.final_amount, "order_id": order_id}

    raise HTTPException(400, "Noma'lum to'lov usuli. 'payme' yoki 'click' kiriting.")


@router.get("/status/{order_id}")
def payment_status(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Buyurtma topilmadi")
    return {
        "order_id": order_id,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "final_amount": order.final_amount,
        "transaction_id": order.payment_transaction_id,
    }


# ─── CLICK WEBHOOK ───────────────────────────────────────────────────────────
# Click API docs: https://docs.click.uz/
# Signature: MD5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)

def _click_sign(click_trans_id, service_id, secret_key, merchant_trans_id, amount, action, sign_time) -> str:
    raw = f"{click_trans_id}{service_id}{secret_key}{merchant_trans_id}{amount}{action}{sign_time}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def _click_verify(data: dict) -> bool:
    if not settings.CLICK_SECRET_KEY:
        return True  # test mode — no key configured
    expected = _click_sign(
        data.get("click_trans_id", ""),
        data.get("service_id", ""),
        settings.CLICK_SECRET_KEY,
        data.get("merchant_trans_id", ""),
        data.get("amount", ""),
        data.get("action", ""),
        data.get("sign_time", ""),
    )
    return hmac.compare_digest(expected, data.get("sign_string", ""))


@router.post("/click/prepare")
async def click_prepare(request: Request, db: Session = Depends(get_db)):
    """Click Prepare step — buyurtmani tekshirish."""
    data = await request.json()
    log.info(f"Click prepare: {data}")

    if not _click_verify(data):
        return {"error": -1, "error_note": "SIGN CHECK FAILED"}

    order_id = data.get("merchant_trans_id")
    amount = float(data.get("amount", 0))

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"error": -5, "error_note": "Buyurtma topilmadi"}
    if order.payment_status == "paid":
        return {"error": -4, "error_note": "Allaqachon to'langan"}

    # Summa farqi 1 so'm dan oshmasin
    if abs(order.final_amount - amount) > 1:
        return {"error": -2, "error_note": "Noto'g'ri summa"}

    return {
        "click_trans_id": data.get("click_trans_id"),
        "merchant_trans_id": order_id,
        "merchant_prepare_id": order_id,
        "error": 0,
        "error_note": "Success",
    }


@router.post("/click/complete")
async def click_complete(request: Request, db: Session = Depends(get_db)):
    """Click Complete step — to'lovni tasdiqlash."""
    data = await request.json()
    log.info(f"Click complete: {data}")

    if not _click_verify(data):
        return {"error": -1, "error_note": "SIGN CHECK FAILED"}

    order_id = data.get("merchant_trans_id")
    click_trans_id = str(data.get("click_trans_id", ""))
    error = int(data.get("error", 0))

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"error": -5, "error_note": "Buyurtma topilmadi"}
    if order.payment_status == "paid":
        return {"error": -4, "error_note": "Allaqachon to'langan"}

    if error == 0:
        order.payment_status = "paid"
        order.payment_transaction_id = click_trans_id
        order.payment_method = "click"
        db.commit()
        log.info(f"Click to'lov qabul qilindi: order={order_id}, txn={click_trans_id}")
        return {
            "click_trans_id": click_trans_id,
            "merchant_trans_id": order_id,
            "merchant_confirm_id": order_id,
            "error": 0,
            "error_note": "Success",
        }

    log.warning(f"Click to'lov rad etildi: error={error}, order={order_id}")
    return {"error": error, "error_note": data.get("error_note", "Xato")}


# ─── PAYME WEBHOOK ───────────────────────────────────────────────────────────
# Payme JSON-RPC 2.0 API
# Docs: https://developer.help.paycom.uz/

PAYME_ERROR = {
    "ORDER_NOT_FOUND":    {"code": -31050, "message": {"uz": "Buyurtma topilmadi", "ru": "Заказ не найден"}},
    "WRONG_AMOUNT":       {"code": -31001, "message": {"uz": "Noto'g'ri summa",     "ru": "Неверная сумма"}},
    "TRANSACTION_NOT_FOUND": {"code": -31003, "message": {"uz": "Tranzaksiya topilmadi", "ru": "Транзакция не найдена"}},
    "CANNOT_PERFORM":     {"code": -31008, "message": {"uz": "Bajara olmaydi", "ru": "Невозможно выполнить"}},
    "ALREADY_DONE":       {"code": -31060, "message": {"uz": "Allaqachon bajarilgan", "ru": "Уже выполнено"}},
    "METHOD_NOT_FOUND":   {"code": -32601, "message": {"uz": "Metod topilmadi", "ru": "Метод не найден"}},
}


def _payme_auth(request: Request) -> bool:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Basic "):
        return False
    try:
        decoded = base64.b64decode(auth[6:]).decode()
        _, key = decoded.split(":", 1)
        if not settings.PAYME_SECRET_KEY:
            return True  # test mode
        return hmac.compare_digest(key, settings.PAYME_SECRET_KEY)
    except Exception:
        return False


def _ms_now() -> int:
    return int(time.time() * 1000)


@router.post("/payme")
async def payme_webhook(request: Request, db: Session = Depends(get_db)):
    """Payme JSON-RPC 2.0 webhook."""
    if not _payme_auth(request):
        raise HTTPException(401, "Unauthorized")

    body = await request.json()
    method = body.get("method", "")
    params = body.get("params", {})
    rpc_id = body.get("id")

    log.info(f"Payme method={method} params={params}")

    def ok(result):
        return {"id": rpc_id, "result": result}

    def err(key):
        return {"id": rpc_id, "error": PAYME_ERROR.get(key, PAYME_ERROR["METHOD_NOT_FOUND"])}

    # ── CheckPerformTransaction ───────────────────────────────────────────────
    if method == "CheckPerformTransaction":
        order_id = params.get("account", {}).get("order_id")
        amount = params.get("amount", 0)  # tiyin
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return err("ORDER_NOT_FOUND")
        expected_tiyin = int(order.final_amount * 100)
        if abs(expected_tiyin - amount) > 100:  # 1 so'm tolerance
            return err("WRONG_AMOUNT")
        return ok({"allow": True})

    # ── CreateTransaction ─────────────────────────────────────────────────────
    if method == "CreateTransaction":
        transaction_id = params.get("id")
        order_id = params.get("account", {}).get("order_id")
        amount = params.get("amount", 0)
        create_time = params.get("time", _ms_now())

        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return err("ORDER_NOT_FOUND")
        if order.payment_status == "paid":
            return err("ALREADY_DONE")

        # Check if transaction already exists
        txn = db.query(PaymeTransaction).filter(
            PaymeTransaction.transaction_id == transaction_id
        ).first()

        if txn:
            if txn.state != 1:
                return err("CANNOT_PERFORM")
            return ok({
                "create_time": txn.create_time,
                "transaction": txn.transaction_id,
                "state": txn.state,
            })

        # Create new transaction
        txn = PaymeTransaction(
            transaction_id=transaction_id,
            order_id=order_id,
            amount=amount,
            state=1,
            create_time=create_time,
        )
        db.add(txn)
        db.commit()
        log.info(f"Payme CreateTransaction: {transaction_id} order={order_id}")
        return ok({
            "create_time": create_time,
            "transaction": transaction_id,
            "state": 1,
        })

    # ── PerformTransaction ────────────────────────────────────────────────────
    if method == "PerformTransaction":
        transaction_id = params.get("id")
        txn = db.query(PaymeTransaction).filter(
            PaymeTransaction.transaction_id == transaction_id
        ).first()
        if not txn:
            return err("TRANSACTION_NOT_FOUND")
        if txn.state == 2:
            return ok({"transaction": transaction_id, "perform_time": txn.perform_time, "state": 2})
        if txn.state != 1:
            return err("CANNOT_PERFORM")

        perform_time = _ms_now()
        txn.state = 2
        txn.perform_time = perform_time

        order = db.query(Order).filter(Order.id == txn.order_id).first()
        if order:
            order.payment_status = "paid"
            order.payment_transaction_id = transaction_id
            order.payment_method = "payme"
        db.commit()
        log.info(f"Payme PerformTransaction: {transaction_id} order={txn.order_id}")
        return ok({"transaction": transaction_id, "perform_time": perform_time, "state": 2})

    # ── CancelTransaction ─────────────────────────────────────────────────────
    if method == "CancelTransaction":
        transaction_id = params.get("id")
        reason = params.get("reason", 1)
        txn = db.query(PaymeTransaction).filter(
            PaymeTransaction.transaction_id == transaction_id
        ).first()
        if not txn:
            return err("TRANSACTION_NOT_FOUND")
        if txn.state == 2:
            return err("CANNOT_PERFORM")  # already performed — cannot cancel

        cancel_time = _ms_now()
        txn.state = -1
        txn.reason = reason
        txn.cancel_time = cancel_time

        order = db.query(Order).filter(Order.id == txn.order_id).first()
        if order:
            order.payment_status = "failed"
        db.commit()
        log.info(f"Payme CancelTransaction: {transaction_id} reason={reason}")
        return ok({"transaction": transaction_id, "cancel_time": cancel_time, "state": -1})

    # ── CheckTransaction ──────────────────────────────────────────────────────
    if method == "CheckTransaction":
        transaction_id = params.get("id")
        txn = db.query(PaymeTransaction).filter(
            PaymeTransaction.transaction_id == transaction_id
        ).first()
        if not txn:
            return err("TRANSACTION_NOT_FOUND")
        return ok({
            "create_time": txn.create_time,
            "perform_time": txn.perform_time or 0,
            "cancel_time": txn.cancel_time or 0,
            "transaction": txn.transaction_id,
            "state": txn.state,
            "reason": txn.reason,
        })

    # ── GetStatement ──────────────────────────────────────────────────────────
    if method == "GetStatement":
        from_time = params.get("from", 0)
        to_time = params.get("to", _ms_now())
        txns = db.query(PaymeTransaction).filter(
            PaymeTransaction.create_time >= from_time,
            PaymeTransaction.create_time <= to_time,
        ).all()
        return ok({"transactions": [{
            "id": t.transaction_id,
            "time": t.create_time,
            "amount": t.amount,
            "account": {"order_id": t.order_id},
            "create_time": t.create_time,
            "perform_time": t.perform_time or 0,
            "cancel_time": t.cancel_time or 0,
            "transaction": t.transaction_id,
            "state": t.state,
            "reason": t.reason,
        } for t in txns]})

    return err("METHOD_NOT_FOUND")
