"""Ko'p tillilik (i18n) - bot uchun matnlar tarjimasi."""

TRANSLATIONS = {
    "uz": {
        "welcome_customer": "Assalomu alaykum, {name}! 👗\n\nMixart Fashion do'koniga xush kelibsiz!\n\nQuyidagi tugmani bosib xarid qiling:",
        "welcome_operator": "Assalomu alaykum, {name}! 👋\n\nSiz <b>operator</b> sifatida tizimga kirdingiz.\n\nBuyruqlar:\n/orders - Yangi buyurtmalar\n/processing - Jarayondagi\n/stats - Statistika",
        "welcome_seller": "Assalomu alaykum, {name}! 👋\n\nSiz <b>sotuvchi</b> sifatida kirdingiz.\n\n/orders - Yangi buyurtmalar",
        "welcome_admin": "Salom, {name}! 👑\n\nSiz <b>admin</b> sifatida kirdingiz.\n\n🌐 Admin panel: {admin_url}\n📦 /orders - Buyurtmalar\n📊 /stats - Statistika",
        "shop_btn": "🛍 Do'konni ochish",
        "help_text": "📞 <b>Aloqa:</b>\n\n📱 Telefon: +998 90 000 00 00\n📧 Email: info@mixart.uz\n💬 Telegram: @mixart_support",
        "no_permission": "❌ Sizda bu buyruq uchun ruxsat yo'q.",
        "order_new": "🆕 <b>Yangi buyurtma #{id}</b>\n\n👤 Mijoz: {customer}\n📞 Tel: {phone}\n📍 Manzil: {address}\n🏪 Filial: <b>{branch}</b>\n💬 Izoh: {note}\n💳 To'lov: {payment}\n💰 Jami: <b>{total} so'm</b>\n📊 Holat: {status}",
        "lang_changed": "✅ Til o'zgartirildi: {lang}",
        "select_lang": "🌐 Tilni tanlang:",
        "orders_loading": "⏳ Buyurtmalaringiz yuklanmoqda...",
        "orders_empty": "📦 Hali buyurtma bermagansiz.\n\nDo'konni ochish uchun /start bosing.",
        "orders_header": "📦 <b>Oxirgi {count} ta buyurtma:</b>",
        "auth_error": "❌ Tizimga kirishda xato. /start bosing.",
        "server_error": "❌ Xato yuz berdi. Qayta urinib ko'ring.",
        "profile_title": "👤 <b>Sizning profilingiz</b>",
        "profile_body": "📛 Ism: {name}\n📞 Tel: {phone}\n🌐 Til: {lang}\n⭐ Loyallik: {level} — {points} ball\n📦 Buyurtmalar: {orders} ta",
        "cancel_ask": "❌ <b>Buyurtmani bekor qilish</b>\n\nOxirgi buyurtmangiz #{id} — {status}\n\nBekor qilmoqchimisiz?",
        "cancel_done": "✅ #{id} buyurtma bekor qilindi.",
        "cancel_failed": "❌ Buyurtmani bekor qilib bo'lmadi. U allaqachon {status} holatida.",
        "cancel_none": "📦 Bekor qilish mumkin bo'lgan buyurtma yo'q.",
        "track_title": "📍 <b>#{id} buyurtma holati</b>",
        "track_body": "📊 Holat: {status}\n💰 Jami: {amount} so'm\n💳 To'lov: {payment} — {pay_status}\n📅 Vaqt: {date}",
        "track_none": "📦 Hali buyurtma bermagansiz.",
        "contact_text": "📞 <b>Biz bilan bog'laning:</b>\n\n📱 Tel: +998 90 000 00 00\n📧 Email: info@mixart.uz\n💬 Telegram: @mixart_support\n🕐 Ish vaqti: 9:00–21:00",
    },
    "ru": {
        "welcome_customer": "Здравствуйте, {name}! 👗\n\nДобро пожаловать в Mixart Fashion!\n\nНажмите кнопку ниже:",
        "welcome_operator": "Здравствуйте, {name}! 👋\n\nВы вошли как <b>оператор</b>.\n\nКоманды:\n/orders - Новые заказы\n/stats - Статистика",
        "welcome_seller": "Здравствуйте, {name}! 👋\n\nВы вошли как <b>продавец</b>.\n\n/orders - Новые заказы",
        "welcome_admin": "Привет, {name}! 👑\n\nВы вошли как <b>администратор</b>.\n\n🌐 Админ панель: {admin_url}\n📦 /orders - Заказы",
        "shop_btn": "🛍 Открыть магазин",
        "help_text": "📞 <b>Контакты:</b>\n\n📱 Телефон: +998 90 000 00 00\n📧 Email: info@mixart.uz",
        "no_permission": "❌ У вас нет прав для этой команды.",
        "order_new": "🆕 <b>Новый заказ #{id}</b>\n\n👤 Клиент: {customer}\n📞 Тел: {phone}\n📍 Адрес: {address}\n🏪 Филиал: <b>{branch}</b>\n💬 Примечание: {note}\n💰 Итого: <b>{total} сум</b>",
        "lang_changed": "✅ Язык изменен: {lang}",
        "select_lang": "🌐 Выберите язык:",
        "orders_loading": "⏳ Ваши заказы загружаются...",
        "orders_empty": "📦 Вы ещё не делали заказов.\n\nНажмите /start, чтобы открыть магазин.",
        "orders_header": "📦 <b>Последние {count} заказа:</b>",
        "auth_error": "❌ Ошибка входа. Нажмите /start.",
        "server_error": "❌ Произошла ошибка. Попробуйте снова.",
        "profile_title": "👤 <b>Ваш профиль</b>",
        "profile_body": "📛 Имя: {name}\n📞 Тел: {phone}\n🌐 Язык: {lang}\n⭐ Лояльность: {level} — {points} баллов\n📦 Заказов: {orders}",
        "cancel_ask": "❌ <b>Отмена заказа</b>\n\nВаш последний заказ #{id} — {status}\n\nОтменить?",
        "cancel_done": "✅ Заказ #{id} отменён.",
        "cancel_failed": "❌ Нельзя отменить. Статус: {status}.",
        "cancel_none": "📦 Нет заказа для отмены.",
        "track_title": "📍 <b>Статус заказа #{id}</b>",
        "track_body": "📊 Статус: {status}\n💰 Сумма: {amount} сум\n💳 Оплата: {payment} — {pay_status}\n📅 Дата: {date}",
        "track_none": "📦 Заказов нет.",
        "contact_text": "📞 <b>Свяжитесь с нами:</b>\n\n📱 Тел: +998 90 000 00 00\n📧 Email: info@mixart.uz\n💬 Telegram: @mixart_support\n🕐 Работаем: 9:00–21:00",
    },
    "en": {
        "welcome_customer": "Hello, {name}! 👗\n\nWelcome to Mixart Fashion!\n\nClick the button below to shop:",
        "welcome_operator": "Hello, {name}! 👋\n\nYou are logged in as <b>operator</b>.\n\nCommands:\n/orders - New orders\n/stats - Statistics",
        "welcome_seller": "Hello, {name}! 👋\n\nYou are logged in as <b>seller</b>.",
        "welcome_admin": "Hello, {name}! 👑\n\nYou are logged in as <b>admin</b>.\n\n🌐 Admin panel: {admin_url}",
        "shop_btn": "🛍 Open store",
        "help_text": "📞 <b>Contact:</b>\n\n📱 Phone: +998 90 000 00 00\n📧 Email: info@mixart.uz",
        "no_permission": "❌ You don't have permission for this command.",
        "order_new": "🆕 <b>New order #{id}</b>\n\n👤 Customer: {customer}\n📞 Phone: {phone}\n📍 Address: {address}\n🏪 Branch: <b>{branch}</b>\n💰 Total: <b>{total} sum</b>",
        "lang_changed": "✅ Language changed: {lang}",
        "select_lang": "🌐 Select language:",
        "orders_loading": "⏳ Loading your orders...",
        "orders_empty": "📦 You have no orders yet.\n\nPress /start to open the store.",
        "orders_header": "📦 <b>Last {count} orders:</b>",
        "auth_error": "❌ Login error. Press /start.",
        "server_error": "❌ An error occurred. Please try again.",
        "profile_title": "👤 <b>Your profile</b>",
        "profile_body": "📛 Name: {name}\n📞 Phone: {phone}\n🌐 Language: {lang}\n⭐ Loyalty: {level} — {points} pts\n📦 Orders: {orders}",
        "cancel_ask": "❌ <b>Cancel order</b>\n\nYour latest order #{id} — {status}\n\nCancel it?",
        "cancel_done": "✅ Order #{id} cancelled.",
        "cancel_failed": "❌ Cannot cancel. Status: {status}.",
        "cancel_none": "📦 No cancellable order found.",
        "track_title": "📍 <b>Order #{id} status</b>",
        "track_body": "📊 Status: {status}\n💰 Total: {amount} sum\n💳 Payment: {payment} — {pay_status}\n📅 Date: {date}",
        "track_none": "📦 No orders yet.",
        "contact_text": "📞 <b>Contact us:</b>\n\n📱 Phone: +998 90 000 00 00\n📧 Email: info@mixart.uz\n💬 Telegram: @mixart_support\n🕐 Hours: 9:00–21:00",
    },
}


def t(key: str, lang: str = "uz", **kwargs) -> str:
    """Tarjima olish."""
    text = (
        TRANSLATIONS.get(lang, {}).get(key)
        or TRANSLATIONS["uz"].get(key)
        or key
    )
    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, IndexError):
            return text
    return text


def detect_lang(telegram_lang_code: str = None) -> str:
    """Telegram client til kodidan til aniqlash."""
    if not telegram_lang_code:
        return "uz"
    code = telegram_lang_code.lower()[:2]
    if code in ["uz", "ru", "en"]:
        return code
    return "uz"
