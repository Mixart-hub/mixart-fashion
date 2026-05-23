from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
from urllib.parse import urlencode
import httpx
import random, string

from app.db.database import get_db
from app.models.models import User, UserRole, LoyaltyAccount, Cart
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, get_current_user
from app.core.config import settings
from app.schemas.schemas import Token, UserCreate, UserOut, GoogleAuthIn

router = APIRouter()

def gen_referral():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def create_user_extras(db, user_id, referral_code=None):
    loyalty = LoyaltyAccount(user_id=user_id, referral_code=gen_referral())
    if referral_code:
        ref = db.query(LoyaltyAccount).filter(LoyaltyAccount.referral_code == referral_code).first()
        if ref:
            ref.points += 500
            loyalty.referred_by = ref.user_id
    db.add(loyalty)
    db.add(Cart(user_id=user_id))

@router.get("/config")
def auth_config():
    return {"google_client_id": settings.GOOGLE_CLIENT_ID or None}

@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    username = form.username.strip()
    user = db.query(User).filter(
        or_(User.phone == username, User.email == username)
    ).first()
    if not user or not user.password_hash or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Login yoki parol noto'g'ri")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Hisob bloklangan")
    return {
        "access_token": create_access_token({"sub": str(user.id), "role": user.role}),
        "refresh_token": create_refresh_token({"sub": str(user.id)}),
        "token_type": "bearer"
    }

@router.post("/google", response_model=Token)
def google_auth(data: GoogleAuthIn, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth sozlanmagan")

    try:
        resp = httpx.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": data.credential},
            timeout=10.0,
        )
    except Exception:
        raise HTTPException(status_code=503, detail="Google serveriga ulanib bo'lmadi")

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Google token yaroqsiz")

    info = resp.json()

    if info.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Token aud mos emas")

    google_id = info.get("sub")
    email = info.get("email")
    full_name = info.get("name") or (email.split("@")[0] if email else "User")

    user = db.query(User).filter(
        or_(User.google_id == google_id, User.email == email)
    ).first()

    if not user:
        user = User(full_name=full_name, email=email, google_id=google_id, language="uz")
        db.add(user)
        db.flush()
        create_user_extras(db, user.id)
        db.commit()
        db.refresh(user)
    else:
        updated = False
        if not user.google_id:
            user.google_id = google_id
            updated = True
        if not user.email:
            user.email = email
            updated = True
        if updated:
            db.commit()

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Hisob bloklangan")

    return {
        "access_token": create_access_token({"sub": str(user.id), "role": user.role}),
        "refresh_token": create_refresh_token({"sub": str(user.id)}),
        "token_type": "bearer"
    }

@router.get("/google")
def google_oauth_start(redirect_to: str = "admin"):
    """OAuth2 redirect flow — Google login sahifasiga yo'naltiradi."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth sozlanmagan")
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": redirect_to,
    }
    return RedirectResponse("https://accounts.google.com/o/oauth2/auth?" + urlencode(params))


@router.get("/google/callback")
def google_oauth_callback(
    code: str = None,
    state: str = "admin",
    error: str = None,
    db: Session = Depends(get_db),
):
    """Google OAuth2 callback — code ni token ga almashtiradi, user ni yaratadi/topadi."""
    if error or not code:
        msg = error or "Google+kirish+bekor+qilindi"
        return RedirectResponse(f"/admin?google_error={msg}")

    try:
        token_resp = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=10.0,
        )
    except Exception:
        return RedirectResponse("/admin?google_error=Server+bilan+aloqa+yo%27q")

    if token_resp.status_code != 200:
        return RedirectResponse("/admin?google_error=Token+olishda+xato")

    id_token_str = token_resp.json().get("id_token")
    if not id_token_str:
        return RedirectResponse("/admin?google_error=id_token+topilmadi")

    try:
        info_resp = httpx.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token_str},
            timeout=10.0,
        )
    except Exception:
        return RedirectResponse("/admin?google_error=Token+tekshirishda+xato")

    if info_resp.status_code != 200:
        return RedirectResponse("/admin?google_error=Token+yaroqsiz")

    info = info_resp.json()
    google_id = info.get("sub")
    email = info.get("email")
    full_name = info.get("name") or (email.split("@")[0] if email else "User")

    user = db.query(User).filter(or_(User.google_id == google_id, User.email == email)).first()
    if not user:
        user = User(full_name=full_name, email=email, google_id=google_id, language="uz")
        db.add(user)
        db.flush()
        create_user_extras(db, user.id)
        db.commit()
        db.refresh(user)
    else:
        updated = False
        if not user.google_id:
            user.google_id = google_id
            updated = True
        if not user.email:
            user.email = email
            updated = True
        if updated:
            db.commit()

    if not user.is_active:
        return RedirectResponse("/admin?google_error=Hisob+bloklangan")

    access_token = create_access_token({"sub": str(user.id), "role": user.role})

    if state == "twa":
        return RedirectResponse(f"/twa?google_token={access_token}")
    return RedirectResponse(f"/admin?google_token={access_token}")


@router.post("/register", response_model=UserOut)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if data.phone and db.query(User).filter(User.phone == data.phone).first():
        raise HTTPException(status_code=400, detail="Bu telefon allaqachon ro'yxatdan o'tgan")
    user = User(
        full_name=data.full_name, phone=data.phone,
        telegram_id=data.telegram_id, language=data.language,
        password_hash=get_password_hash(data.password) if data.password else None
    )
    db.add(user)
    db.flush()
    create_user_extras(db, user.id, data.referral_code)
    db.commit()
    db.refresh(user)
    return user

@router.post("/telegram", response_model=Token)
def telegram_auth(telegram_id: str, full_name: str, language: str = "uz",
                  referral_code: str = None, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        user = User(telegram_id=telegram_id, full_name=full_name, language=language)
        db.add(user)
        db.flush()
        create_user_extras(db, user.id, referral_code)
        db.commit()
        db.refresh(user)
    return {
        "access_token": create_access_token({"sub": str(user.id), "role": user.role}),
        "refresh_token": create_refresh_token({"sub": str(user.id)}),
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserOut)
def me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    return user
