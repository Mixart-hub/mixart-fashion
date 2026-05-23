"""
Mahsulotlar, rasmlar va sklad tekshirish.
Ishlatish: python check_products.py
"""
import sys, os, sqlite3, json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "backend", "mixart.db")

if not os.path.exists(DB_PATH):
    print(f"DB topilmadi: {DB_PATH}")
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=" * 55)
print("MAHSULOTLAR TEKSHIRUVI")
print("=" * 55)

prods = cur.execute("SELECT * FROM products WHERE is_active=1").fetchall()
print(f"\nMahsulotlar: {len(prods)} ta\n")

media_dir = os.path.join(BASE_DIR, "backend", "media")
print(f"Media papka: {media_dir}")
print(f"Media papka mavjud: {os.path.exists(media_dir)}")
if os.path.exists(media_dir):
    files = []
    for root, dirs, fs in os.walk(media_dir):
        for f in fs:
            files.append(os.path.join(root, f))
    print(f"Media fayllari: {len(files)} ta")
    for f in files[:10]:
        print(f"  {f}")

print()
for p in prods:
    imgs = []
    try:
        raw = p['images']
        if raw:
            imgs = json.loads(raw) if isinstance(raw, str) else raw
    except:
        imgs = []

    stocks = cur.execute(
        "SELECT size, color, quantity FROM stocks WHERE product_id=?", (p['id'],)
    ).fetchall()

    print(f"ID:{p['id']} | {p['name_uz']}")
    print(f"  Narx: ${p['price']}")
    print(f"  O'lchamlar: {p['sizes']}")
    print(f"  Ranglar: {p['colors']}")
    print(f"  Rasmlar ({len(imgs)} ta): {imgs[:2]}")
    print(f"  Sklad: {[(s['size'], s['color'], s['quantity']) for s in stocks]}")
    
    # Rasm fayl mavjudmi?
    for img_url in imgs:
        if '/media/' in img_url:
            path = img_url.split('/media/')[-1]
            full_path = os.path.join(media_dir, path)
            exists = os.path.exists(full_path)
            print(f"  Rasm fayl: {full_path} -> {'OK' if exists else 'YOQ!'}")
    print()

conn.close()
