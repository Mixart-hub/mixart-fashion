"""
MIX AI - O'RNATISH SKRIPTI
Bu fayl Gemini SDK ni o'rnatadi va hamma kerakli sozlamalarni qiladi.

Ishlatish: python install_mix_ai.py
"""
import os
import sys
import subprocess
import shutil


def color(text, c):
    colors = {"red": "\033[91m", "green": "\033[92m", "yellow": "\033[93m",
              "blue": "\033[94m", "purple": "\033[95m", "cyan": "\033[96m"}
    return f"{colors.get(c, '')}{text}\033[0m"


print(color("=" * 60, "purple"))
print(color("  🤖 MIX AI - O'RNATISH BOSHLANDI", "purple"))
print(color("=" * 60, "purple"))
print()

BASE = os.path.dirname(os.path.abspath(__file__))
print(f"📁 Loyiha papkasi: {BASE}")

# 1. Kerakli papkalar
print("\n" + color("1️⃣ Papkalarni tayyorlash...", "cyan"))

required_dirs = [
    "backend/app/services",
]

for d in required_dirs:
    full = os.path.join(BASE, d)
    os.makedirs(full, exist_ok=True)
    print(f"   ✓ {d}")

# 2. Gemini SDK o'rnatish
print("\n" + color("2️⃣ Gemini SDK o'rnatish...", "cyan"))

try:
    import google.generativeai as genai
    print("   ✓ google-generativeai allaqachon o'rnatilgan")
except ImportError:
    print("   📥 Yuklab olinmoqda...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "google-generativeai>=0.8.0"],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print("   ✓ google-generativeai o'rnatildi")
    else:
        print(color(f"   ❌ Xato: {result.stderr}", "red"))
        sys.exit(1)

# 3. .env tekshirish
print("\n" + color("3️⃣ .env.windows tekshirish...", "cyan"))

env_path = os.path.join(BASE, ".env.windows")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        env_content = f.read()
    
    if "GEMINI_API_KEY" in env_content:
        # Qiymatini tekshirish
        for line in env_content.split("\n"):
            if line.startswith("GEMINI_API_KEY"):
                key = line.split("=", 1)[1].strip()
                if key and len(key) > 20 and key.startswith("AIza"):
                    print(color(f"   ✓ GEMINI_API_KEY topildi (len: {len(key)})", "green"))
                else:
                    print(color("   ⚠️  GEMINI_API_KEY noto'g'ri ko'rinadi", "yellow"))
                break
    else:
        print(color("   ⚠️  GEMINI_API_KEY .env.windows da yo'q!", "yellow"))
        print(color("   📝 Iltimos qo'shing: GEMINI_API_KEY=AIza...", "yellow"))
else:
    print(color(f"   ❌ {env_path} topilmadi!", "red"))

# 4. requirements.txt yangilash
print("\n" + color("4️⃣ requirements.txt yangilash...", "cyan"))

req_path = os.path.join(BASE, "backend", "requirements.txt")
if os.path.exists(req_path):
    with open(req_path, "r", encoding="utf-8") as f:
        req_content = f.read()
    
    if "google-generativeai" not in req_content:
        with open(req_path, "a", encoding="utf-8") as f:
            f.write("\ngoogle-generativeai>=0.8.0\n")
        print("   ✓ google-generativeai requirements.txt ga qo'shildi")
    else:
        print("   ✓ google-generativeai allaqachon bor")

# 5. Gemini bilan test
print("\n" + color("5️⃣ Gemini API test qilish...", "cyan"))

# .env yuklash
try:
    from dotenv import load_dotenv
    load_dotenv(env_path)
except:
    # Manual yuklash
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()

api_key = os.getenv("GEMINI_API_KEY", "")
if api_key:
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content("Salom, bir so'z bilan javob ber!")
        
        if response.text:
            print(color(f"   ✓ Gemini ishlayapti!", "green"))
            print(color(f"   💬 Javob: {response.text.strip()[:100]}", "cyan"))
        else:
            print(color("   ⚠️  Bo'sh javob", "yellow"))
    except Exception as e:
        print(color(f"   ❌ Test xato: {e}", "red"))
        print(color("   API kalitingiz to'g'ri ekanligini tekshiring", "yellow"))
else:
    print(color("   ⏭ API kalit yo'q, test o'tkazib yuborildi", "yellow"))

# Xulosa
print()
print(color("=" * 60, "purple"))
print(color("  ✅ O'RNATISH TUGADI!", "green"))
print(color("=" * 60, "purple"))
print()

print(color("📋 KEYINGI QADAMLAR:", "cyan"))
print()
print("1. Mix AI servis fayllarini joylashtiring:")
print(color("   ai_service.py → backend/app/services/ai.py", "yellow"))
print(color("   ai_endpoint.py → backend/app/api/v1/endpoints/ai.py", "yellow"))
print()
print("2. backend/app/main.py ga AI router qo'shing:")
print(color('   from app.api.v1.endpoints.ai import router as ai_router', "yellow"))
print(color('   app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI"])', "yellow"))
print()
print("3. Backendni qayta ishga tushiring:")
print(color("   python run.py", "yellow"))
print()
print("4. Test qiling:")
print(color("   curl http://localhost:8000/api/v1/ai/status", "yellow"))
print()
print(color("🚀 Mix tirik! 🤖", "green"))
