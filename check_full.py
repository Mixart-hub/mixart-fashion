"""
Mahsulot va kategoriya to'liq tekshiruv.
Ishlatish: python check_full.py
"""
import sys, os, sqlite3, json

BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, "backend", "mixart.db")
MEDIA = os.path.join(BASE, "backend", "media", "products")

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=" * 60)
print("MAHSULOTLAR TO'LIQ TEKSHIRUV")
print("=" * 60)

prods = cur.execute("SELECT * FROM products WHERE is_active=1").fetchall()
print(f"\nJami mahsulotlar: {len(prods)} ta\n")

for p in prods:
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"ID: {p['id']} | Nomi: {p['name_uz']}")
    print(f"  Narx: {p['price']} | Eski narx: {p['old_price']}")
    print(f"  Kategoriya ID: {p['category_id']}")
    print(f"  Tavsif: {p['description_uz'][:50] + '...' if p['description_uz'] and len(p['description_uz']) > 50 else (p['description_uz'] or 'YOQ')}")

    # Sizes / Colors
    try:
        sizes = json.loads(p['sizes']) if p['sizes'] else []
        colors = json.loads(p['colors']) if p['colors'] else []
    except:
        sizes, colors = [], []
    print(f"  O'lchamlar: {sizes}")
    print(f"  Ranglar: {colors}")

    # Images
    try:
        imgs = json.loads(p['images']) if p['images'] else []
    except:
        imgs = []
    print(f"  Rasmlar: {len(imgs)} ta")
    for img in imgs:
        if img.startswith('/media/'):
            full = os.path.join(BASE, "backend", img.lstrip('/'))
            exists = "✅" if os.path.exists(full) else "❌"
            print(f"    {exists} {img}")
        else:
            print(f"    [base64/external] {img[:60]}...")

    # Stocks
    stocks = cur.execute(
        "SELECT s.*, b.name as branch_name FROM stocks s LEFT JOIN branches b ON b.id=s.branch_id WHERE s.product_id=?",
        (p['id'],)
    ).fetchall()
    print(f"  Sklad ({len(stocks)} ta):")
    for s in stocks:
        print(f"    Filial: {s['branch_name'] or 'YOQ'} | {s['size']} | {s['color']} | {s['quantity']} dona")

print(f"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(f"\nMEDIA papka: {MEDIA}")
print(f"Mavjud: {os.path.exists(MEDIA)}")
if os.path.exists(MEDIA):
    files = os.listdir(MEDIA)
    print(f"Fayllar: {len(files)} ta")
    for f in files[:10]:
        size = os.path.getsize(os.path.join(MEDIA, f))
        print(f"  {f} ({size} bayt)")

# Kategoriyalar
print("\n" + "=" * 60)
print("KATEGORIYALAR")
print("=" * 60)
cats = cur.execute("SELECT * FROM categories").fetchall()
for c in cats:
    print(f"  ID:{c['id']} | {c['emoji']} {c['name_uz']}")

# Filiallar
print("\n" + "=" * 60)
print("FILIALLAR")
print("=" * 60)
brs = cur.execute("SELECT * FROM branches WHERE is_active=1").fetchall()
for b in brs:
    print(f"  ID:{b['id']} | {b['name']} | {b['address']}")

conn.close()
