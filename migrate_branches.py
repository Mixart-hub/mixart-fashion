"""
Stocks jadvaliga branch_id ustun qo'shish va default filial yaratish.
Ishlatish: python migrate_branches.py
"""
import sys, os, sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "backend", "mixart.db")

if not os.path.exists(DB_PATH):
    print(f"DB topilmadi: {DB_PATH}")
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

print("=" * 50)
print("FILIALLAR VA OMBOR MIGRATSIYA")
print("=" * 50)

# 1. branch_id ustun mavjudmi?
cols = [c[1] for c in cur.execute("PRAGMA table_info(stocks)").fetchall()]
print(f"\nstocks ustunlari: {cols}")

if 'branch_id' not in cols:
    print("\nbranch_id ustunini qo'shish...")
    cur.execute("ALTER TABLE stocks ADD COLUMN branch_id INTEGER DEFAULT NULL REFERENCES branches(id)")
    print("✅ branch_id qo'shildi")
else:
    print("✅ branch_id allaqachon bor")

# 2. Asosiy filial mavjudmi?
branches = cur.execute("SELECT id, name FROM branches WHERE is_active=1").fetchall()
print(f"\nMavjud filiallar: {len(branches)} ta")
for b in branches:
    print(f"  ID:{b[0]} | {b[1]}")

if not branches:
    print("\nDefault filial yaratish...")
    cur.execute("""
        INSERT INTO branches (name, address, phone, is_active, created_at)
        VALUES ('Asosiy filial', 'Toshkent', '+998901234567', 1, datetime('now'))
    """)
    default_id = cur.lastrowid
    print(f"✅ Asosiy filial yaratildi: ID={default_id}")
else:
    default_id = branches[0][0]

# 3. Eski sklad yozuvlariga default filial belgilash
no_branch = cur.execute("SELECT COUNT(*) FROM stocks WHERE branch_id IS NULL").fetchone()[0]
if no_branch > 0:
    print(f"\nFilialsiz {no_branch} ta sklad yozuvi → Asosiy filialga biriktirildi")
    cur.execute("UPDATE stocks SET branch_id=? WHERE branch_id IS NULL", (default_id,))
    print(f"✅ {no_branch} ta yozuv yangilandi")

# 4. UNIQUE constraint qayta yaratish
print("\nIndex qayta yaratilmoqda...")
try:
    cur.execute("DROP INDEX IF EXISTS sqlite_autoindex_stocks_1")
except: pass
try:
    cur.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_per_branch 
        ON stocks (product_id, size, color, branch_id)
    """)
    print("✅ Index yaratildi")
except Exception as e:
    print(f"Index xato: {e}")

conn.commit()

# Tekshiruv
print("\n" + "=" * 50)
print("TEKSHIRUV")
print("=" * 50)
total = cur.execute("SELECT COUNT(*) FROM stocks").fetchone()[0]
with_branch = cur.execute("SELECT COUNT(*) FROM stocks WHERE branch_id IS NOT NULL").fetchone()[0]
print(f"Jami sklad: {total} ta")
print(f"Filial bilan: {with_branch} ta")
print(f"\nFiliallar bo'yicha sklad:")
rows = cur.execute("""
    SELECT b.name, COUNT(s.id), COALESCE(SUM(s.quantity), 0)
    FROM branches b LEFT JOIN stocks s ON s.branch_id = b.id
    GROUP BY b.id, b.name
""").fetchall()
for name, cnt, total_qty in rows:
    print(f"  {name}: {cnt} ta yozuv, jami {total_qty} dona")

conn.close()
print("\n✅ Migratsiya tugadi!")
