"""
MIX AI - Markaziy AI servisi (yangi google-genai SDK)
"""
import os
import json
import logging
import asyncio
import traceback
from typing import Optional, Dict, Any, List
from datetime import datetime

from google import genai
from google.genai import types

log = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
MODEL_NAME = "gemini-2.5-flash-lite"


# ═══════════════════════════════════════════════════════════
# 🎭 MIX SHAXSIYATI
# ═══════════════════════════════════════════════════════════
ADMIN_PROMPT = """Sen Mix - Mixart Fashion do'konining AI yordamchisi va biznes hamkorisan.

🎭 SHAXSIYATING:
- Sen do'stona, hazilkash, lekin aqlli xodimsan
- Boss bilan o'rtoq kabi gaplash, lekin hurmat bilan
- Vaqti-vaqti bilan kichik hazil qil (ortiqcha emas)
- Energetik, motivatsiyalovchi
- Mixart'ni o'z biznesing kabi hisoblaysan

🗣 GAPIRISH USULI:
✅ "Salom boss! 👋"
✅ "Voy, sotuvlar a'lo darajada! 🔥"
✅ "Hahaha, tushinaman boss 😅"
✅ "Bugun zo'r kun bo'ladi, ishonaman 💪"

❌ "Sun'iy intellekt sifatida..." (ROBOTSIZMAN DEMA!)
❌ "Hurmatli foydalanuvchi..."
❌ Ortiqcha rasmiy gap

🎯 MAQSADING:
1. Boss vaqtini tejash - tez va aniq javob
2. Tavsiyalar ber, lekin qaror boss ishi
3. Yaxshi ishlaganda maqta, yomonda dalda ber

🚨 MUHIM:
- HECH QACHON "men sun'iy intellektman" yoki "AI" dema
- Sen Mix - oddiy yordamchi
- Bilmasang - "boss, tekshirib aytaman" dey
- Emoji ishlat (1-3 ta xabar uchun)
- O'zbek tilida gaplash (so'm, mln, ta)

📅 BUGUN: {today}
⏰ HOZIRGI VAQT: {time}
🌅 KUNNING QISMI: {time_period}
"""

CUSTOMER_PROMPT = """Sen Mix - Mixart Fashion do'konining stilisti va yordamchisi.

🎭 SHAXSIYATING:
- Yumshoq, mehribon, do'stona  
- Engil hazilkash (mijoz xafa bo'lmasin)
- Sabrli, hech qachon zerikma
- Stil va moda bilimdoni
- Mijozni do'sting kabi qarashing

🗣 GAPIRISH USULI:
✅ "Salom! 😊"
✅ "Voy, juda yaxshi tanlov! 👌"
✅ "Sizga juda yarashadi!"
✅ "Tashvishlanmang, men yordam beraman"

❌ "Hurmatli mijoz..."
❌ "Sizning so'rovingiz bo'yicha..."
❌ Robotsizman demang

🛍 SEN NIMA QILA OLASAN:
- Mahsulot tavsiya qilasan (rang, o'lcham, narx)
- O'lcham bo'yicha maslahat (bo'y, vazn asosida)
- Stil maslahatlari
- Komplekt taklifi
- Yetkazib berish, to'lov haqida ma'lumot
- Promo kodlar bilan yordam

⚠️ NIMA QILMASLIK:
- Yolg'on ma'lumot bermang
- Bilmasangiz - "operator bilan bog'layman" dey
- Mijozni majburlamang

📅 BUGUN: {today}
⏰ HOZIRGI VAQT: {time}

💡 MIXART HAQIDA:
- 3 filial: Chilonzor, Mixart (Mega Planet), Chorvoq (Bochka)
- Yetkazib berish: Toshkent ichida BEPUL (1-2 kun)
- Ish vaqti: 09:00 - 21:00
- Bot 24/7
"""


# ═══════════════════════════════════════════════════════════
# 🧠 MIX AI CLASS
# ═══════════════════════════════════════════════════════════
class MixAI:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = (api_key or GEMINI_API_KEY).strip()
        self.client = None
        
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                log.info("✅ Mix AI: Gemini client tayyor")
            except Exception as e:
                log.error(f"❌ Mix AI init xato: {e}")
        else:
            log.warning("⚠️ GEMINI_API_KEY belgilanmagan!")
        
        # Sessiyalar (chat history)
        self.sessions: Dict[str, List] = {}
    
    def _get_time_period(self) -> str:
        h = datetime.now().hour
        if 6 <= h < 11: return "tong"
        if 11 <= h < 14: return "tushlik"
        if 14 <= h < 18: return "kunduz"
        if 18 <= h < 22: return "kechqurun"
        return "tun"
    
    def _build_system_prompt(self, user_role: str = "customer") -> str:
        now = datetime.now()
        params = {
            "today": now.strftime("%d.%m.%Y, %A"),
            "time": now.strftime("%H:%M"),
            "time_period": self._get_time_period(),
        }
        if user_role == "admin":
            return ADMIN_PROMPT.format(**params)
        return CUSTOMER_PROMPT.format(**params)
    
    def get_session_id(self, user_id: str, role: str) -> str:
        return f"{role}:{user_id}"
    
    async def chat(
        self,
        message: str,
        user_id: str = "default",
        user_role: str = "customer",
        image_data: Optional[bytes] = None,
        audio_data: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """Mix bilan suhbat."""
        if not self.client:
            return {
                "text": "Kechirasiz, hozir AI ishlamayapti. API kalit muammo.",
                "error": "no_client"
            }
        
        try:
            session_id = self.get_session_id(user_id, user_role)
            
            # Sessiya tarixini olish
            history = self.sessions.get(session_id, [])
            
            # Content tayyorlash
            parts = [types.Part.from_text(text=message)]
            
            if image_data:
                parts.append(types.Part.from_bytes(
                    data=image_data,
                    mime_type="image/jpeg"
                ))
            
            if audio_data:
                parts.append(types.Part.from_bytes(
                    data=audio_data,
                    mime_type="audio/ogg"
                ))
            
            # Yangi xabar
            new_content = types.Content(
                role="user",
                parts=parts
            )
            
            # Tarix + yangi xabar
            contents = history + [new_content]
            
            # Config
            config = types.GenerateContentConfig(
                system_instruction=self._build_system_prompt(user_role),
                temperature=0.85,
                top_p=0.9,
                top_k=40,
                max_output_tokens=1024,
            )
            
            # Yuborish — 429/503 uchun retry
            response = None
            for attempt in range(3):
                try:
                    response = await asyncio.to_thread(
                        self.client.models.generate_content,
                        model=MODEL_NAME,
                        contents=contents,
                        config=config,
                    )
                    break
                except Exception as retry_exc:
                    err_str = str(retry_exc)
                    if attempt < 2 and ("429" in err_str or "503" in err_str or "UNAVAILABLE" in err_str or "EXHAUSTED" in err_str):
                        wait = (attempt + 1) * 4
                        log.warning(f"Mix AI retry {attempt+1}/3 after {wait}s: {type(retry_exc).__name__}")
                        await asyncio.sleep(wait)
                    else:
                        raise

            text = response.text or "" if response else ""
            
            # Tarixga qo'shish — user xabari bilan boshlanishi shart
            updated = contents + [
                types.Content(role="model", parts=[types.Part.from_text(text=text)])
            ]
            # Oxirgi 20 ta, lekin har doim user bilan boshlash kerak
            if len(updated) > 20:
                updated = updated[-20:]
                # Agar birinchi element model bo'lsa, user dan boshlash
                while updated and updated[0].role != "user":
                    updated = updated[1:]
            self.sessions[session_id] = updated
            
            return {
                "text": text,
                "session_id": session_id,
                "error": None,
            }
        
        except Exception as e:
            log.error(f"Mix chat error: {type(e).__name__}: {e}")
            log.error(traceback.format_exc())
            print(f"\n{'='*60}\nMIX CHAT ERROR: {type(e).__name__}: {e}\n{traceback.format_exc()}{'='*60}\n")
            return {
                "text": "Voy, kichik muammo: hozir o'ylash qiyin bo'lyapti 😅 Yana urinib ko'ring iltimos!",
                "error": str(e),
            }
    
    async def analyze_image(self, image_data: bytes, prompt: str = "") -> str:
        """Rasm tahlili."""
        if not self.client:
            return ""
        
        default_prompt = """Bu mahsulot rasmini ko'rib, kiyim do'koni uchun chiroyli tavsif yoz.

JSON formatda javob ber:
{
    "name": "mahsulot nomi (qisqa, jozibali)",
    "category": "kategoriya (ko'ylak/shim/kepka/oyoq kiyim)",
    "color": "asosiy rang",
    "description": "to'liq tavsif (2-3 jumla, jozibali)",
    "suggested_price": narx_taxminiy_so'mda,
    "tags": ["tag1", "tag2"],
    "season": "yoz/qish/bahor/kuz/hammasi"
}"""
        
        try:
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=MODEL_NAME,
                contents=[
                    types.Content(role="user", parts=[
                        types.Part.from_text(text=prompt or default_prompt),
                        types.Part.from_bytes(data=image_data, mime_type="image/jpeg")
                    ])
                ]
            )
            return response.text or ""
        except Exception as e:
            log.error(f"Image analysis error: {e}")
            return ""
    
    async def transcribe_audio(self, audio_data: bytes, mime_type: str = "audio/ogg") -> str:
        """Audio'ni matnga aylantirish."""
        if not self.client:
            return ""

        supported = {"audio/ogg", "audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/flac", "audio/aiff"}
        if mime_type not in supported:
            mime_type = "audio/ogg"

        try:
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=MODEL_NAME,
                contents=[
                    types.Content(role="user", parts=[
                        types.Part.from_text(
                            text="Bu ovozli xabarni o'zbek tilida matnga ayirib bering. Faqat matnni qaytaring."
                        ),
                        types.Part.from_bytes(data=audio_data, mime_type=mime_type)
                    ])
                ]
            )
            return (response.text or "").strip()
        except Exception as e:
            log.error(f"Audio transcribe error: {e}")
            return ""
    
    def clear_session(self, user_id: str, role: str = "customer"):
        session_id = self.get_session_id(user_id, role)
        self.sessions.pop(session_id, None)
    
    async def daily_morning_brief(self, stats: Dict[str, Any]) -> str:
        """Admin ertangi xulosa."""
        prompt = f"""Boss uchun ertangi xulosa tayyorla.

Kechagi sotuv: {stats.get('yesterday_sales', 0):,} so'm
Buyurtmalar: {stats.get('yesterday_orders', 0)} ta
Yangi mijozlar: {stats.get('new_customers', 0)} ta
Top mahsulot: {stats.get('top_product', 'N/A')}
Kam qolgan: {stats.get('low_stock_count', 0)} ta

Format:
🌅 Salom boss! [tabrik]

Kechagi natijalar:
[3-4 ta asosiy ko'rsatkich]

Bugun uchun:
[tavsiyalar]

[motivatsion gap]"""
        
        result = await self.chat(prompt, user_role="admin")
        return result.get("text", "")
    
    def is_ready(self) -> bool:
        return self.client is not None


# Singleton
mix_ai = MixAI()


# ═══════════════════════════════════════════════════════════
# TEST
# ═══════════════════════════════════════════════════════════
async def test():
    print("🧪 Mix AI test...")
    
    if not mix_ai.is_ready():
        print("❌ AI tayyor emas (API kalit yo'q)")
        return
    
    result = await mix_ai.chat("Salom Mix, qisqa salomlash!", user_role="admin")
    print(f"\n✅ Javob:\n{result['text']}\n")


if __name__ == "__main__":
    asyncio.run(test())
