"""
Dastlabki ma'lumotlar — production uchun to'liq seed
Ishlatish: python seed.py
"""
import sys, os, random, string
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, engine, Base
from app.models.models import (
    Category, Product, Stock, Branch, User, UserRole,
    LoyaltyAccount, PromoCode, LoyaltyLevel, Notification
)
from app.core.security import get_password_hash

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def gen_referral():
    return "MIX" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def seed():
    print("🌱 Seed boshlandi...")

    # ── Filiallar ─────────────────────────────────────────────────────────────
    if not db.query(Branch).first():
        branches = [
            Branch(
                name="Chilonzor filiali",
                address="Toshkent, Chilonzor tumani, Bunyodkor ko'chasi 15",
                phone="+998901234567",
                latitude=41.2995, longitude=69.2401,
            ),
            Branch(
                name="Yunusobod filiali",
                address="Toshkent, Yunusobod tumani, Amir Temur ko'chasi 107B",
                phone="+998901234568",
                latitude=41.3569, longitude=69.2853,
            ),
            Branch(
                name="Mirzo Ulug'bek filiali",
                address="Toshkent, Mirzo Ulug'bek tumani, Mavlono Lutfiy 45",
                phone="+998901234569",
                latitude=41.3264, longitude=69.3247,
            ),
        ]
        db.add_all(branches)
        db.flush()
        print(f"  ✅ {len(branches)} ta filial")

    # ── Kategoriyalar ─────────────────────────────────────────────────────────
    if not db.query(Category).first():
        cats = [
            Category(id=1, name_uz="Ko'ylaklar",       name_ru="Платья",       name_en="Dresses",    emoji="👗", sort_order=1),
            Category(id=2, name_uz="Bluzalar",          name_ru="Блузки",       name_en="Blouses",    emoji="👚", sort_order=2),
            Category(id=3, name_uz="Shimlar",           name_ru="Брюки",        name_en="Pants",      emoji="👖", sort_order=3),
            Category(id=4, name_uz="Sumkalar",          name_ru="Сумки",        name_en="Bags",       emoji="👜", sort_order=4),
            Category(id=5, name_uz="Zargarlik",         name_ru="Украшения",    name_en="Jewelry",    emoji="💍", sort_order=5),
            Category(id=6, name_uz="Sharf va ro'mol",   name_ru="Шарфы",        name_en="Scarves",    emoji="🧣", sort_order=6),
            Category(id=7, name_uz="Poyabzal",          name_ru="Обувь",        name_en="Footwear",   emoji="👠", sort_order=7),
            Category(id=8, name_uz="Yangi kelganlar",   name_ru="Новинки",      name_en="New In",     emoji="✨", sort_order=0),
        ]
        db.add_all(cats)
        db.flush()
        print(f"  ✅ {len(cats)} ta kategoriya")

    # ── Admin ─────────────────────────────────────────────────────────────────
    if not db.query(User).filter(User.role == UserRole.ADMIN).first():
        admin = User(
            full_name="Super Admin",
            phone="+998900000000",
            email="admin@mixart.uz",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            language="uz",
        )
        db.add(admin)
        db.flush()
        db.add(LoyaltyAccount(user_id=admin.id, points=0, level=LoyaltyLevel.BRONZE, referral_code=gen_referral()))
        print(f"  ✅ Admin: +998900000000 / admin123")

    # ── Operator ──────────────────────────────────────────────────────────────
    if not db.query(User).filter(User.role == UserRole.OPERATOR).first():
        op = User(
            full_name="Operator 1",
            phone="+998901111111",
            password_hash=get_password_hash("operator123"),
            role=UserRole.OPERATOR,
            language="uz",
        )
        db.add(op)
        db.flush()
        print(f"  ✅ Operator: +998901111111 / operator123")

    # ── Mahsulotlar ───────────────────────────────────────────────────────────
    if not db.query(Product).first():
        products = [
            Product(
                name_uz="Floral ko'ylak",     name_ru="Цветочное платье",   name_en="Floral Dress",
                description_uz="Yengil floral naqshli ko'ylak. Bahor-yoz uchun ideal. 100% paxta.",
                description_ru="Лёгкое платье с цветочным принтом. Идеально для весны-лета. 100% хлопок.",
                price=350_000, old_price=450_000, category_id=1,
                images=[], sizes=["XS","S","M","L","XL"],
                colors=["Pushti","Oq","Sariq","Ko'k"],
                is_trending=True, is_new_arrival=True,
                material="100% paxta", care_instructions="30°C da yuvish. Qo'lda yuvish tavsiya etiladi.",
            ),
            Product(
                name_uz="Mini çanta",         name_ru="Мини сумка",          name_en="Mini Bag",
                description_uz="Zamonaviy mini çanta. Har qanday kiyimga mos keladi. Charm teri.",
                description_ru="Современная мини-сумка. Подходит к любому образу. Экокожа.",
                price=580_000, category_id=4,
                images=[], sizes=["ONE SIZE"],
                colors=["Bej","Qora","Qo'ng'ir"],
                is_trending=True,
                material="Eko charm", care_instructions="Quruq matoda artish.",
            ),
            Product(
                name_uz="Bilak uzuk to'plami", name_ru="Набор браслетов",    name_en="Bracelet Set",
                description_uz="3 xil bilak uzuk to'plami. Oltin rangli. Mis qotishmadan.",
                description_ru="Набор из 3 браслетов. Позолоченные. Из медного сплава.",
                price=150_000, category_id=5,
                images=[], sizes=["ONE SIZE"],
                colors=["Oltin","Kumush"],
                is_new_arrival=True,
                material="Mis qotishma",
            ),
            Product(
                name_uz="Yengil bluza",        name_ru="Лёгкая блузка",      name_en="Light Blouse",
                description_uz="Yengil material, nafas oladi. Ofis va dam olish uchun. Krep matosi.",
                description_ru="Лёгкий дышащий материал. Для офиса и отдыха. Крепдешин.",
                price=220_000, old_price=320_000, category_id=2,
                images=[], sizes=["S","M","L","XL"],
                colors=["Oq","Ko'k","Pushti","Lavanda"],
                is_trending=True,
                material="Krep", care_instructions="30°C da yuvish.",
            ),
            Product(
                name_uz="Keng shim",           name_ru="Широкие брюки",       name_en="Wide Pants",
                description_uz="Zamona modasi — keng kesim shim. Yuqori bel. Viskoza.",
                description_ru="Модные широкие брюки с высокой талией. Вискоза.",
                price=400_000, old_price=580_000, category_id=3,
                images=[], sizes=["S","M","L","XL"],
                colors=["Qora","Jigarrang","Kulrang","Bej"],
                material="Viskoza", care_instructions="30°C da yuvish. Quruq tozalash.",
            ),
            Product(
                name_uz="Ipak sharf",          name_ru="Шёлковый шарф",       name_en="Silk Scarf",
                description_uz="100% tabiiy ipak sharf. 90x90 sm. Nozik va chiroyli.",
                description_ru="100% натуральный шёлковый платок. 90x90 см.",
                price=180_000, old_price=280_000, category_id=6,
                images=[], sizes=["ONE SIZE"],
                colors=["Pushti","Oq","Ko'k","Qizil"],
                is_trending=True,
                material="100% ipak", care_instructions="Faqat quruq tozalash.",
            ),
            Product(
                name_uz="Kechki ko'ylak",      name_ru="Вечернее платье",     name_en="Evening Dress",
                description_uz="Maxsus tadbirlar uchun kechki ko'ylak. Elastik material. Uzun.",
                description_ru="Вечернее платье для особых случаев. Эластичный материал. Длинное.",
                price=1_200_000, category_id=1,
                images=[], sizes=["XS","S","M","L","XL"],
                colors=["Qora","Qizil","Ko'k","Yashil"],
                is_new_arrival=True,
                material="Poliester + Elastan", care_instructions="Quruq tozalash.",
            ),
            Product(
                name_uz="Sport sumka",         name_ru="Спортивная сумка",    name_en="Sport Bag",
                description_uz="Sport va sayohat uchun qulay sumka. 30 litr. Suvga chidamli.",
                description_ru="Удобная сумка для спорта и путешествий. 30 л. Водонепроницаемая.",
                price=450_000, category_id=4,
                images=[], sizes=["ONE SIZE"],
                colors=["Qora","Kulrang","Ko'k"],
                material="Nylon 600D",
            ),
            Product(
                name_uz="Klassik ko'ylak",     name_ru="Классическое платье", name_en="Classic Dress",
                description_uz="Klassik A-shakl ko'ylak. Har kunlik kiyim. Paxta-lin aralashmasi.",
                description_ru="Классическое А-образное платье. На каждый день. Хлопково-льняная смесь.",
                price=280_000, category_id=1,
                images=[], sizes=["XS","S","M","L"],
                colors=["Bej","Oq","Kulrang","Qoʻngʻir"],
                is_trending=True,
                material="55% paxta, 45% zig'ir",
            ),
            Product(
                name_uz="Zarhal uzuk",         name_ru="Позолоченное кольцо", name_en="Gold Ring",
                description_uz="Zarhal qoplangan uzuk. 925 kumush asosi. Regulyovka: 16-19 mm.",
                description_ru="Кольцо с позолотой. Основа 925 серебро. Регулируемое: 16-19 мм.",
                price=95_000, category_id=5,
                images=[], sizes=["ONE SIZE"],
                colors=["Oltin","Kumush"],
                is_new_arrival=True,
                material="925 Kumush + Zarhal",
            ),
            Product(
                name_uz="Baland poshnali tufli", name_ru="Туфли на каблуке", name_en="Heeled Shoes",
                description_uz="7 sm poshna. Asosiy material: sun'iy charm. Yozgi kolleksiya.",
                description_ru="Каблук 7 см. Искусственная кожа. Летняя коллекция.",
                price=650_000, old_price=850_000, category_id=7,
                images=[], sizes=["36","37","38","39","40","41"],
                colors=["Qora","Bej","Qizil"],
                is_trending=True,
                material="Sun'iy charm",
            ),
            Product(
                name_uz="Yozgi kombinezon",    name_ru="Летний комбинезон",   name_en="Summer Jumpsuit",
                description_uz="Yozgi yengil kombinezon. Gul naqshi. Paxta. S-XL.",
                description_ru="Лёгкий летний комбинезон с цветочным принтом. Хлопок.",
                price=320_000, old_price=420_000, category_id=1,
                images=[], sizes=["S","M","L","XL"],
                colors=["Pushti","Moviy","Sariq"],
                is_new_arrival=True,
                material="100% paxta",
            ),
        ]
        db.add_all(products)
        db.flush()

        # Sklad — har bir mahsulot uchun
        branches_list = db.query(Branch).all()
        for p in products:
            for size in (p.sizes or ["ONE SIZE"]):
                for color in (p.colors or ["Default"]):
                    for branch in branches_list:
                        db.add(Stock(
                            product_id=p.id,
                            branch_id=branch.id,
                            size=size,
                            color=color,
                            quantity=random.randint(5, 30),
                            min_quantity=3,
                        ))

        print(f"  ✅ {len(products)} ta mahsulot + sklad")

    # ── Promo kodlar ──────────────────────────────────────────────────────────
    if not db.query(PromoCode).first():
        promos = [
            PromoCode(code="MIXART10",  discount_percent=10, max_uses=100, is_active=True),
            PromoCode(code="MIXART15",  discount_percent=15, max_uses=50,  is_active=True),
            PromoCode(code="WELCOME20", discount_percent=20, max_uses=200, is_active=True),
            PromoCode(code="VIP30",     discount_percent=30, max_uses=20,  is_active=True),
            PromoCode(code="SALE50",    discount_percent=50, max_uses=10,  is_active=True),
        ]
        db.add_all(promos)
        print(f"  ✅ {len(promos)} ta promo kod: MIXART10, MIXART15, WELCOME20, VIP30, SALE50")

    db.commit()

    print("\n🎉 Seed muvaffaqiyatli yakunlandi!")
    print("━" * 50)
    print("📌 Admin login:")
    print("   Tel: +998900000000")
    print("   Parol: admin123")
    print("   Panel: /admin")
    print("━" * 50)
    print("📌 Promo kodlar: MIXART10 (10%) | MIXART15 (15%) | WELCOME20 (20%)")
    print("━" * 50)


if __name__ == "__main__":
    seed()
    db.close()
