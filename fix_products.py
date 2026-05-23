"""
Mahsulotlar rasmini va sklad ma'lumotlarini tuzatish.
Ishlatish: python fix_products.py
mixart/ papkasida ishga tushiring.
"""
import sys, os, sqlite3, json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "backend", "mixart.db")
MEDIA    = os.path.join(BASE_DIR, "backend", "media", "products")

os.makedirs(MEDIA, exist_ok=True)

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=" * 55)
print("MAHSULOTLAR TUZATISH")
print("=" * 55)

prods = cur.execute("SELECT * FROM products WHERE is_active=1").fetchall()

for p in prods:
    pid = p['id']
    name = p['name_uz']

    # Sizes va Colors ni sizesdan o'qish
    sizes_raw = p['sizes']
    colors_raw = p['colors']
    sizes = []
    colors = []
    try:
        if sizes_raw:
            sizes = json.loads(sizes_raw) if isinstance(sizes_raw, str) else sizes_raw
        if colors_raw:
            colors = json.loads(colors_raw) if isinstance(colors_raw, str) else colors_raw
    except:
        pass

    # Sklad ma'lumotlari
    stocks = cur.execute(
        "SELECT size, color, quantity FROM stocks WHERE product_id=?", (pid,)
    ).fetchall()

    print(f"\nID:{pid} | {name}")
    print(f"  Sizes: {sizes}")
    print(f"  Colors: {colors}")
    print(f"  Stocks: {[(s['size'], s['color'], s['quantity']) for s in stocks]}")

    # Agar sizes/colors bo'sh bo'lsa va sklad bo'lsa, skladdan olish
    need_update = False
    new_sizes = list(sizes)
    new_colors = list(colors)

    for stock in stocks:
        sz = stock['size']
        cl = stock['color']
        if sz and sz not in new_sizes:
            new_sizes.append(sz)
            need_update = True
        if cl and cl not in new_colors:
            new_colors.append(cl)
            need_update = True

    if need_update or (not sizes and not colors and stocks):
        cur.execute(
            "UPDATE products SET sizes=?, colors=? WHERE id=?",
            (json.dumps(new_sizes, ensure_ascii=False),
             json.dumps(new_colors, ensure_ascii=False), pid)
        )
        print(f"  ✅ Yangilandi: sizes={new_sizes}, colors={new_colors}")

    # Rasm URL larini tekshirish va tuzatish
    imgs_raw = p['images']
    imgs = []
    try:
        if imgs_raw:
            imgs = json.loads(imgs_raw) if isinstance(imgs_raw, str) else imgs_raw
    except:
        pass

    valid_imgs = []
    for url in imgs:
        if '/media/products/' in url:
            fname = url.split('/media/products/')[-1].split('?')[0]
            fpath = os.path.join(MEDIA, fname)
            if os.path.exists(fpath):
                # URL ni tozalash (localhost o'rniga relative)
                valid_imgs.append('/media/products/' + fname)
                print(f"  ✅ Rasm OK: {fname}")
            else:
                print(f"  ❌ Rasm YOQ: {fname}")
        elif url.startswith('/media/'):
            valid_imgs.append(url)
        elif url.startswith('data:'):
            valid_imgs.append(url)

    if valid_imgs != imgs:
        cur.execute(
            "UPDATE products SET images=? WHERE id=?",
            (json.dumps(valid_imgs, ensure_ascii=False), pid)
        )
        print(f"  ✅ Rasmlar yangilandi: {len(valid_imgs)} ta")

conn.commit()
conn.close()

print("\n" + "=" * 55)
print("Tuzatish tugadi!")
print("\nEndi:")
print("1. python run.py qayta ishga tushiring")
print("2. Admin panelda mahsulotga rasm qayta yuklang")
print("3. Botdan mahsulotni oching")
