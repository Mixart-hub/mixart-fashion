"""
Notifications jadvaliga failed_count, failed_reason, sent_at maydonlarini qo'shish.
Ishlatish: python migrate_notifications.py
"""
import os, sys, sqlite3

BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, "backend", "mixart.db")

if not os.path.exists(DB):
    print(f"❌ DB topilmadi: {DB}")
    sys.exit(1)

conn = sqlite3.connect(DB)
cur = conn.cursor()

print("=" * 50)
print("NOTIFICATIONS MIGRATSIYA")
print("=" * 50)

# Mavjud ustunlarni olish
cols = [c[1] for c in cur.execute("PRAGMA table_info(notifications)").fetchall()]
print(f"Mavjud ustunlar: {cols}")

migrations = [
    ("failed_count", "ALTER TABLE notifications ADD COLUMN failed_count INTEGER DEFAULT 0"),
    ("failed_reason", "ALTER TABLE notifications ADD COLUMN failed_reason VARCHAR(500)"),
    ("sent_at", "ALTER TABLE notifications ADD COLUMN sent_at TIMESTAMP"),
]

for col_name, sql in migrations:
    if col_name in cols:
        print(f"  ✅ {col_name} - allaqachon bor")
    else:
        try:
            cur.execute(sql)
            print(f"  ➕ {col_name} - qo'shildi")
        except Exception as e:
            print(f"  ❌ {col_name} - xato: {e}")

conn.commit()
conn.close()

print("\n✅ Migratsiya tugadi!")
