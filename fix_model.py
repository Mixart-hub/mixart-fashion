"""
ai.py dagi MODEL_NAME ni to'g'ri modelga almashtirish.
Ishlatish: python fix_model.py
"""
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
AI_PY = os.path.join(BASE, "backend", "app", "services", "ai.py")

if not os.path.exists(AI_PY):
    print(f"❌ Topilmadi: {AI_PY}")
    sys.exit(1)

with open(AI_PY, "r", encoding="utf-8") as f:
    content = f.read()

# Eski model nomlarini almashtirish
replacements = [
    ('MODEL_NAME = "gemini-2.0-flash-exp"', 'MODEL_NAME = "gemini-2.0-flash"'),
    ('MODEL_PRO = "gemini-2.0-flash-exp"', 'MODEL_PRO = "gemini-2.0-flash"'),
    ('"gemini-2.0-flash-exp"', '"gemini-2.0-flash"'),
]

changed = False
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        changed = True
        print(f"✅ {old} → {new}")

if changed:
    with open(AI_PY, "w", encoding="utf-8") as f:
        f.write(content)
    print("\n✅ ai.py yangilandi!")
    print("Endi run.py ni qayta ishga tushiring (Ctrl+C va python run.py)")
else:
    print("⚠️  Hech narsa topilmadi - ehtimol allaqachon to'g'ri")
