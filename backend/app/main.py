from app.api.v1.endpoints.ai import router as ai_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from app.core.config import settings
from app.db.database import engine, Base, run_migrations
from app.api.v1.endpoints import auth, products, orders, cart, reports, payments
from app.api.v1.endpoints.branches import router_branches, router_users
from app.api.v1.endpoints.promo import router as promo_router
from app.api.v1.endpoints.inventory import router as inventory_router
from app.api.v1.endpoints.system import router as system_router, router_bot_settings
from app.api.v1.endpoints.marketing import router_flash, router_promo, router_notify, router_bot
import os

Base.metadata.create_all(bind=engine)
run_migrations()
# Media papkasini mutlaq yo'lda yaratish
import pathlib
_MEDIA_ABS = os.path.abspath(settings.MEDIA_DIR)
os.makedirs(_MEDIA_ABS, exist_ok=True)
os.makedirs(os.path.join(_MEDIA_ABS, "products"), exist_ok=True)
print(f"[main] MEDIA_DIR: {_MEDIA_ABS}")

# ── Yo'llar ────────────────────────────────────────────────────────────────
_THIS      = os.path.abspath(__file__)
_ROOT      = os.path.dirname(os.path.dirname(os.path.dirname(_THIS)))
TWA_DIST   = os.path.join(_ROOT, "frontend", "dist")
ADMIN_HTML = os.path.join(_ROOT, "frontend", "admin.html")
TWA_INDEX  = os.path.join(TWA_DIST, "index.html")

print(f"[main] ROOT     : {_ROOT}")
print(f"[main] TWA_DIST : {TWA_DIST}  exists={os.path.isdir(TWA_DIST)}")
print(f"[main] TWA_INDEX: {TWA_INDEX} exists={os.path.exists(TWA_INDEX)}")

# ── FastAPI ────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Media ──────────────────────────────────────────────────────────────────
app.mount("/media", StaticFiles(directory=os.path.abspath(settings.MEDIA_DIR)), name="media")

# ── API Routerlar ──────────────────────────────────────────────────────────
app.include_router(auth.router,         prefix="/api/v1/auth",         tags=["Auth"])
app.include_router(products.router,     prefix="/api/v1/products",     tags=["Mahsulotlar"])
app.include_router(orders.router,       prefix="/api/v1/orders",       tags=["Buyurtmalar"])
app.include_router(cart.router,         prefix="/api/v1/cart",         tags=["Savat"])
app.include_router(reports.router,      prefix="/api/v1/reports",      tags=["Hisobotlar"])
app.include_router(payments.router,     prefix="/api/v1/payments",     tags=["Tolovlar"])
app.include_router(router_branches,     prefix="/api/v1/branches",     tags=["Filiallar"])
app.include_router(router_users,        prefix="/api/v1/users",        tags=["Foydalanuvchilar"])
app.include_router(router_flash,        prefix="/api/v1/flash-sales",  tags=["Flash Sale"])
app.include_router(system_router,       prefix="/api/v1/system",        tags=["Tizim"])
app.include_router(inventory_router,    prefix="/api/v1/inventory",     tags=["Ombor"])
app.include_router(promo_router,        prefix="/api/v1/promo",         tags=["Promo"])
app.include_router(router_notify,       prefix="/api/v1/notifications",tags=["Bildirishnomalar"])
app.include_router(router_bot,          prefix="/api/v1/bot",           tags=["Bot Sozlamalar"])
app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI"])
app.include_router(router_bot_settings, prefix="/api/v1/bot-settings", tags=["Bot Sozlamalari"])

# ── Admin Panel ────────────────────────────────────────────────────────────
@app.get("/admin", include_in_schema=False)
@app.get("/admin/", include_in_schema=False)
def admin_panel():
    if os.path.exists(ADMIN_HTML):
        return FileResponse(ADMIN_HTML, media_type="text/html")
    return {"error": "admin.html topilmadi"}

# ── React TWA static assets ────────────────────────────────────────────────
# assets/ papkasini to'g'ridan-to'g'ri serve qilish (307 muammosi yo'q)
if os.path.isdir(TWA_DIST):
    _assets = os.path.join(TWA_DIST, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="twa-assets")
        print(f"[main] /assets mount qilindi: {_assets}")

    # favicon
    _fav = os.path.join(TWA_DIST, "favicon.ico")

    @app.get("/favicon.ico", include_in_schema=False)
    def favicon():
        if os.path.exists(_fav):
            return FileResponse(_fav)
        return FileResponse(TWA_INDEX)

    # /twa → index.html (SPA)
    @app.get("/twa", include_in_schema=False)
    @app.get("/twa/", include_in_schema=False)
    def twa_root():
        return FileResponse(TWA_INDEX, media_type="text/html")

    @app.get("/twa/{full_path:path}", include_in_schema=False)
    def twa_spa(full_path: str):
        # Agar fayl mavjud bo'lsa uni qaytaramiz
        file_path = os.path.join(TWA_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(TWA_INDEX, media_type="text/html")

else:
    @app.get("/twa", include_in_schema=False)
    def twa_not_built():
        return {
            "message": "React TWA hali build qilinmagan.",
            "hint": "cd frontend && npm install && npm run build",
            "expected": TWA_DIST,
        }

# ── Health ─────────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "db": settings.DATABASE_URL.split("://")[0],
        "twa": os.path.isdir(TWA_DIST),
        "twa_path": TWA_DIST,
        "admin": os.path.exists(ADMIN_HTML),
    }

@app.get("/", tags=["System"])
def root():
    return {
        "app": settings.APP_NAME,
        "docs": "/docs",
        "admin": "/admin",
        "twa": "/twa",
        "health": "/health",
    }
