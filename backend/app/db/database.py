from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import os

# ── SQLite yoki PostgreSQL avtomatik tanlanadi ─────────────────────────────
def _make_engine():
    url = settings.DATABASE_URL

    # SQLite (Windows / local ishlab chiqish)
    if url.startswith("sqlite"):
        # Fayl yo'lini yaratib olish
        db_path = url.replace("sqlite:///", "").replace("sqlite://", "")
        if db_path and db_path != ":memory:":
            os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)

        eng = create_engine(
            url,
            connect_args={"check_same_thread": False},  # SQLite uchun majburiy
            echo=settings.DEBUG,
        )

        # SQLite da Foreign Key qo'llab-quvvatlashni yoqish
        @event.listens_for(eng, "connect")
        def set_sqlite_pragma(conn, _):
            conn.execute("PRAGMA foreign_keys=ON")
            conn.execute("PRAGMA journal_mode=WAL")   # parallel o'qish uchun

        return eng

    # PostgreSQL (production / Docker)
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=settings.DEBUG,
    )


engine       = _make_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()


def run_migrations():
    """Yangi ustunlarni mavjud DB ga qo'shish — SQLite va PostgreSQL uchun."""
    is_pg = not settings.DATABASE_URL.startswith("sqlite")

    new_cols = [
        ("users", "email",      "VARCHAR(200)"),
        ("users", "google_id",  "VARCHAR(200)"),
        ("users", "updated_at", "TIMESTAMP"),
        ("branches", "latitude",  "FLOAT"),
        ("branches", "longitude", "FLOAT"),
    ]
    with engine.connect() as conn:
        insp = None
        try:
            from sqlalchemy import inspect as sa_inspect
            insp = sa_inspect(engine)
        except Exception:
            pass

        for table, col, typedef in new_cols:
            # Skip if column already exists (PostgreSQL-safe check)
            if insp:
                try:
                    existing = [c["name"] for c in insp.get_columns(table)]
                    if col in existing:
                        continue
                except Exception:
                    pass
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {typedef}"))
                conn.commit()
                print(f"[migration] {table}.{col} qo'shildi")
            except Exception:
                pass  # ustun allaqachon mavjud yoki jadval yo'q


def get_db():
    """FastAPI Depends uchun DB sessiyasi."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

