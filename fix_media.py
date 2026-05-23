"""
Media papkasini yaratish va mavjud rasmlarni DB dan tozalash.
Ishlatish: python fix_media.py
mixart/ papkasida ishga tushiring.
"""
import sys, os, sqlite3, json, shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "backend", "mixart.db")
MEDIA    = os.path.join(BASE_DIR, "backend", "media", "products")

# Media papkasini yaratish
os.makedirs(MEDIA, exist_ok=True)
print(f"[OK] Media papka: {MEDIA}")

conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()

# Barcha mahsulotlardagi rasm URL larini tekshirish
prods = cur.execute("SELECT id, name_uz, images FROM products WHERE is_active=1").fetchall()
print(f"\nMahsulotlar: {len(prods)} ta\n")

fixed = 0
for pid, name, imgs_raw in prods:
    imgs = []
    try:
        if imgs_raw:
            imgs = json.loads(imgs_raw) if isinstance(imgs_raw, str) else imgs_raw
    except:
        imgs = []

    valid_imgs = []
    for url in imgs:
        # Fayl yo'lini olish
        if '/media/products/' in url:
            fname = url.split('/media/products/')[-1]
            fpath = os.path.join(MEDIA, fname)
            if os.path.exists(fpath):
                valid_imgs.append(url)
                print(f"  [OK] {name}: {fname}")
            else:
                print(f"  [YOQ] {name}: {fname} - o'chiriladi")
                fixed += 1
        else:
            valid_imgs.append(url)  # base64 yoki boshqa URL

    # DB yangilash
    cur.execute("UPDATE products SET images=? WHERE id=?",
                (json.dumps(valid_imgs, ensure_ascii=False), pid))

conn.commit()
conn.close()
print(f"\n[OK] {fixed} ta yo'q rasm URL o'chirildi")
print("\nEndi admin paneldan rasmlarni qayta yuklang.")
print(f"Media papka: {MEDIA}")
