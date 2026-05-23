"""
Bazadagi rasm URL larini tozalash.
- Mavjud bo'lmagan fayllarni o'chiradi
- localhost URL larni relative qiladi
- Eng to'g'ri formatga keltiradi: /media/products/xxx.png

Ishlatish: python clean_images.py
mixart/ papkasida ishga tushiring.
"""
import sys, os, sqlite3, json

BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, "backend", "mixart.db")
MEDIA_ROOT = os.path.abspath(os.path.join(BASE, "backend", "media"))
PRODUCTS_DIR = os.path.join(MEDIA_ROOT, "products")

# Papka mavjudligini ta'minlash
os.makedirs(PRODUCTS_DIR, exist_ok=True)

if not os.path.exists(DB):
    print(f"❌ DB topilmadi: {DB}")
    sys.exit(1)

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=" * 60)
print("RASMLARNI TOZALASH")
print("=" * 60)
print(f"DB:    {DB}")
print(f"Media: {PRODUCTS_DIR}")
print()

# Media papkasidagi haqiqiy fayllar
existing_files = set()
if os.path.exists(PRODUCTS_DIR):
    existing_files = set(os.listdir(PRODUCTS_DIR))
print(f"Media papkadagi fayllar: {len(existing_files)} ta\n")

prods = cur.execute("SELECT id, name_uz, images FROM products").fetchall()
print(f"Bazadagi mahsulotlar: {len(prods)} ta\n")

stats = {"cleaned": 0, "valid": 0, "removed": 0, "fixed_url": 0}

for p in prods:
    pid = p["id"]
    name = p["name_uz"]

    if not p["images"]:
        continue

    try:
        imgs = json.loads(p["images"]) if isinstance(p["images"], str) else (p["images"] or [])
    except Exception:
        imgs = []

    valid = []
    print(f"📦 ID:{pid} | {name}")

    for url in imgs:
        if not url:
            continue

        # base64 saqlash
        if url.startswith("data:"):
            valid.append(url)
            print(f"   ✅ base64 ma'lumot")
            stats["valid"] += 1
            continue

        # /media/products/xxx.png ni qidirish
        fname = None
        if "/media/products/" in url:
            fname = url.split("/media/products/")[-1].split("?")[0].split("#")[0]
        elif url.startswith("/media/"):
            # /media/xxx.png
            fname = url.split("/media/")[-1].split("?")[0]
            if "/" in fname:
                fname = fname.split("/")[-1]

        if fname and fname in existing_files:
            new_url = f"/media/products/{fname}"
            valid.append(new_url)
            if new_url != url:
                stats["fixed_url"] += 1
                print(f"   🔄 URL tuzatildi: {url[:50]}... -> {new_url}")
            else:
                print(f"   ✅ {fname}")
            stats["valid"] += 1
        else:
            print(f"   ❌ Yo'q: {url[:60]}")
            stats["removed"] += 1

    # DB yangilash
    if valid != imgs:
        cur.execute(
            "UPDATE products SET images = ? WHERE id = ?",
            (json.dumps(valid, ensure_ascii=False), pid)
        )
        stats["cleaned"] += 1

conn.commit()
conn.close()

print("\n" + "=" * 60)
print("XULOSA")
print("=" * 60)
print(f"  ✅ Yaroqli rasmlar:    {stats['valid']}")
print(f"  ❌ O'chirilgan:        {stats['removed']}")
print(f"  🔄 URL tuzatilgan:     {stats['fixed_url']}")
print(f"  📝 Yangilangan mahsulot: {stats['cleaned']}")
print()
if stats["removed"] > 0:
    print("⚠️  Yo'q rasmlarni admin paneldan qayta yuklang!")
