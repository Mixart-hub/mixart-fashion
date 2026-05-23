import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { cartAPI, orderAPI, authAPI, loyaltyAPI, systemAPI } from '../../services/api'
import { useStore } from '../../store/store'
import AddressInput from '../common/AddressInput'
import PaymentMethodSelector from '../common/PaymentMethodSelector'

const DELIVERY_FEE = 15000
const MEDIA_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')
const mediaUrl = (u) => !u ? null : (u.startsWith('http') ? u : `${MEDIA_BASE}${u}`)

function fmtMoney(v) {
  return v ? Math.round(Number(v)).toLocaleString('ru-RU') : '0'
}

const TXT = {
  uz: {
    cart: 'Savat', empty: 'Savat bo\'sh', shop: 'Xarid qilish',
    address: '📍 Yetkazib berish manzili:', payment: '💳 To\'lov usuli:',
    total: 'Jami', delivery: 'Yetkazib berish', products: 'Mahsulotlar',
    order: 'Buyurtma berish', placing: 'Buyurtma berilmoqda...',
    addressHint: 'Shahar, ko\'cha, uy raqami...', loading: 'Yuklanmoqda...',
    noAuth: 'Savatni ko\'rish uchun Telegram orqali kiring',
    promo: '🏷 Promo kod', promoHint: 'Promo kodingiz...',
    promoApply: 'Qo\'llash', promoOk: 'chegirma!', note: '📝 Izoh (ixtiyoriy)',
    noteHint: 'Maxsus talab yoki eslatma...',
    orders: '📦 Buyurtmalarim', noOrders: 'Buyurtmalar yo\'q',
    profile: 'Profil', phone: 'Telefon ko\'rsatilmagan', loyalty: 'Loyallik dasturi',
    points: 'ball', langTitle: '🌐 Til:', myOrders: 'Buyurtmalarim',
    contactUs: '💬 Bog\'lanish', helpCenter: '❓ Yordam markazi',
  },
  ru: {
    cart: 'Корзина', empty: 'Корзина пуста', shop: 'Купить',
    address: '📍 Адрес доставки:', payment: '💳 Способ оплаты:',
    total: 'Итого', delivery: 'Доставка', products: 'Товары',
    order: 'Оформить заказ', placing: 'Оформляем...',
    addressHint: 'Город, улица, дом...', loading: 'Загрузка...',
    noAuth: 'Войдите через Telegram для просмотра корзины',
    promo: '🏷 Промо код', promoHint: 'Введите промо код...',
    promoApply: 'Применить', promoOk: 'скидка!', note: '📝 Примечание',
    noteHint: 'Особые пожелания...',
    orders: '📦 Мои заказы', noOrders: 'Заказов нет',
    profile: 'Профиль', phone: 'Телефон не указан', loyalty: 'Программа лояльности',
    points: 'балл', langTitle: '🌐 Язык:', myOrders: 'Мои заказы',
    contactUs: '💬 Связаться', helpCenter: '❓ Помощь',
  },
  en: {
    cart: 'Cart', empty: 'Cart is empty', shop: 'Shop',
    address: '📍 Delivery address:', payment: '💳 Payment method:',
    total: 'Total', delivery: 'Delivery', products: 'Products',
    order: 'Place order', placing: 'Placing order...',
    addressHint: 'City, street, building...', loading: 'Loading...',
    noAuth: 'Login via Telegram to view cart',
    promo: '🏷 Promo code', promoHint: 'Enter promo code...',
    promoApply: 'Apply', promoOk: 'discount!', note: '📝 Note',
    noteHint: 'Special requests...',
    orders: '📦 My Orders', noOrders: 'No orders',
    profile: 'Profile', phone: 'Phone not specified', loyalty: 'Loyalty program',
    points: 'pts', langTitle: '🌐 Language:', myOrders: 'My Orders',
    contactUs: '💬 Contact', helpCenter: '❓ Help',
  },
}

const DELIVERY_SLOTS = [
  { id: 'morning',   label: { uz: '🌅 Ertalab',   ru: '🌅 Утром',   en: '🌅 Morning'   }, sub: { uz: '9:00–12:00', ru: '9:00–12:00', en: '9:00–12:00' } },
  { id: 'afternoon', label: { uz: '🌤 Tushdan keyin', ru: '🌤 Днём', en: '🌤 Afternoon' }, sub: { uz: '12:00–17:00', ru: '12:00–17:00', en: '12:00–17:00' } },
  { id: 'evening',   label: { uz: '🌙 Kechqurun',  ru: '🌙 Вечером', en: '🌙 Evening'   }, sub: { uz: '17:00–21:00', ru: '17:00–21:00', en: '17:00–21:00' } },
]

export function CartPage() {
  const nav = useNavigate()
  const { user, setCartCount, lang } = useStore()
  const tx = TXT[lang] || TXT.uz
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [payMethod, setPayMethod] = useState('cash')
  const [address, setAddress] = useState('')
  const [deliveryName, setDeliveryName] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [deliverySlot, setDeliverySlot] = useState('afternoon')
  const [note, setNote] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoMsg, setPromoMsg] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [phoneErr, setPhoneErr] = useState('')

  useEffect(() => {
    if (!user) { setLoading(false); return }
    cartAPI.get(user.id).then(setCart).catch(() => {}).finally(() => setLoading(false))
    if (user.full_name) setDeliveryName(user.full_name)
    if (user.phone) setDeliveryPhone(user.phone)
  }, [user])

  async function refreshCart() {
    if (!user) return
    const c = await cartAPI.get(user.id).catch(() => null)
    if (c) { setCart(c); setCartCount(c.item_count || 0) }
  }

  async function updateQty(item_id, qty) {
    await cartAPI.update(user.id, item_id, qty).catch(() => {})
    await refreshCart()
  }

  async function removeItem(item_id) {
    await cartAPI.remove(user.id, item_id).catch(() => {})
    await refreshCart()
  }

  async function applyPromo() {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoMsg('')
    try {
      const res = await loyaltyAPI.checkPromo(promoCode.trim().toUpperCase())
      if (res.valid) {
        const disc = Math.round((subtotal * res.discount_percent) / 100)
        setPromoDiscount(disc)
        setPromoMsg(`✅ ${res.discount_percent}% ${tx.promoOk} (-${fmtMoney(disc)} so'm)`)
        toast.success(`Promo kod qo'llanildi! -${res.discount_percent}%`)
      } else {
        setPromoDiscount(0)
        setPromoMsg(`❌ ${res.message || 'Kod noto\'g\'ri'}`)
        toast.error(res.message || "Promo kod noto'g'ri")
      }
    } catch {
      setPromoMsg('❌ Tekshirishda xato')
    } finally {
      setPromoLoading(false)
    }
  }

  async function placeOrder() {
    if (!address.trim()) { toast.error('Manzilni kiriting'); return }
    setPhoneErr('')
    const phone = deliveryPhone.trim()
    if (!phone) { setPhoneErr(lang === 'ru' ? 'Укажите номер телефона' : 'Telefon raqamini kiriting'); return }
    if (!/^\+?[\d\s\-()]{7,15}$/.test(phone)) { setPhoneErr(lang === 'ru' ? 'Неверный формат' : 'Noto\'g\'ri format'); return }
    setPlacing(true)
    const slot = DELIVERY_SLOTS.find(s => s.id === deliverySlot)
    try {
      const items = cart.items.map(i => ({
        product_id: i.product.id, size: i.size, color: i.color,
        quantity: i.quantity, price: i.product.price,
      }))
      const order = await orderAPI.create({
        customer_id: user.id, items,
        total_amount: subtotal,
        delivery_amount: DELIVERY_FEE,
        promo_code: promoCode.trim().toUpperCase() || null,
        delivery_address: address,
        delivery_name: deliveryName.trim() || user?.full_name || null,
        delivery_phone: phone,
        estimated_delivery: slot ? slot.sub.uz : null,
        note: note.trim() || null,
        payment_method: payMethod,
      })
      await cartAPI.clear(user.id)
      setCartCount(0)
      const ordNum = order?.id || ''
      toast.success(`Buyurtma yaratildi! ${ordNum}`, { duration: 4000 })
      if (payMethod !== 'cash' && order?.id) {
        nav(`/checkout-success?order_id=${order.id}`)
      } else {
        nav('/orders')
      }
    } catch { toast.error("Buyurtma yaratishda xato. Qayta urinib ko'ring.") }
    finally { setPlacing(false) }
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
      <div style={{ color: '#9CA3AF', fontSize: 12 }}>{tx.loading}</div>
    </div>
  )
  if (!user) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
      <div style={{ color: '#6B7280', fontSize: 13 }}>{tx.noAuth}</div>
    </div>
  )

  const items = cart?.items || []
  const subtotal = cart?.total || 0
  const discount = promoDiscount
  const final = subtotal - discount + DELIVERY_FEE

  return (
    <div>
      <div style={{ background: '#1C1C1E', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{tx.cart} ({items.length})</span>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🛒</div>
          <div style={{ color: '#6B7280', marginBottom: 16 }}>{tx.empty}</div>
          <button onClick={() => nav('/catalog')} style={{ background: '#C9956C', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 28px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{tx.shop}</button>
        </div>
      ) : (
        <div style={{ padding: 12 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6', padding: 10, marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
              <div onClick={() => nav(`/product/${item.product.id}`)} style={{ width: 56, height: 56, borderRadius: 12, background: '#FDF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, overflow: 'hidden', cursor: 'pointer' }}>
                {item.product.images?.[0]
                  ? <img src={mediaUrl(item.product.images[0])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : '👗'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name_uz}</div>
                <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{item.size} · {item.color}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#C9956C', marginTop: 3 }}>{fmtMoney(item.product.price)} so'm</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <button onClick={() => updateQty(item.id, item.quantity - 1)} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: '#f3edf0', cursor: 'pointer', fontSize: 14, color: '#C9956C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, item.quantity + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: '#f3edf0', cursor: 'pointer', fontSize: 14, color: '#C9956C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 4 }}>{fmtMoney(item.subtotal)} so'm</span>
                </div>
              </div>
              <button onClick={() => removeItem(item.id)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontSize: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          ))}

          {/* Promo kod */}
          <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6', padding: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#111827', marginBottom: 8 }}>{tx.promo}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
                placeholder={tx.promoHint}
                style={{ flex: 1, border: '1px solid #F3F4F6', borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none', letterSpacing: 1 }} />
              <button onClick={applyPromo} disabled={promoLoading || !promoCode.trim()} style={{ padding: '8px 14px', background: '#C9956C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontWeight: 600, opacity: promoCode.trim() ? 1 : 0.6 }}>
                {promoLoading ? '...' : tx.promoApply}
              </button>
            </div>
            {promoMsg && <div style={{ fontSize: 11, marginTop: 6, color: promoMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{promoMsg}</div>}
          </div>

          <AddressInput
            address={address}
            onAddress={setAddress}
            note={note}
            onNote={setNote}
            lang={lang}
            onGPS={(lat, lon) => setAddress(`${lat}, ${lon}`)}
          />

          {/* Qabul qiluvchi ma'lumotlari */}
          <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6', padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1C1C1E', marginBottom: 10 }}>
              {lang === 'ru' ? '👤 Получатель' : lang === 'en' ? '👤 Recipient' : '👤 Qabul qiluvchi'}
            </div>
            <input
              value={deliveryName}
              onChange={e => setDeliveryName(e.target.value)}
              placeholder={lang === 'ru' ? 'Имя получателя...' : lang === 'en' ? 'Recipient name...' : 'Ism familiya...'}
              style={{ width: '100%', border: '1px solid #F3F4F6', borderRadius: 10, padding: '8px 10px', fontSize: 12, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
            />
            <input
              value={deliveryPhone}
              onChange={e => { setDeliveryPhone(e.target.value); setPhoneErr('') }}
              placeholder="+998 90 123 45 67"
              type="tel"
              style={{ width: '100%', border: `1px solid ${phoneErr ? '#EF4444' : '#F3F4F6'}`, borderRadius: 10, padding: '8px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
            {phoneErr && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{phoneErr}</div>}
          </div>

          {/* Yetkazib berish vaqti */}
          <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6', padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1C1C1E', marginBottom: 10 }}>
              {lang === 'ru' ? '🕐 Время доставки' : lang === 'en' ? '🕐 Delivery time' : '🕐 Yetkazib berish vaqti'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {DELIVERY_SLOTS.map(s => {
                const active = deliverySlot === s.id
                return (
                  <button key={s.id} onClick={() => setDeliverySlot(s.id)} style={{
                    flex: 1, padding: '9px 4px', borderRadius: 10, border: active ? '2px solid #C9956C' : '1px solid #F3F4F6',
                    background: active ? '#FDF6F0' : '#fafafa', cursor: 'pointer', transition: 'all .15s', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? '#C9956C' : '#374151' }}>
                      {s.label[lang] || s.label.uz}
                    </div>
                    <div style={{ fontSize: 9, color: active ? '#B87333' : '#9CA3AF', marginTop: 2 }}>
                      {s.sub[lang] || s.sub.uz}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <PaymentMethodSelector selected={payMethod} onChange={setPayMethod} lang={lang} />

          {/* Jami */}
          <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6', padding: 14, marginBottom: 12 }}>
            {[
              [tx.products, `${fmtMoney(subtotal)} so'm`],
              ...(discount > 0 ? [['🏷 Chegirma', `-${fmtMoney(discount)} so'm`]] : []),
              [tx.delivery, `${fmtMoney(DELIVERY_FEE)} so'm`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', padding: '4px 0' }}>
                <span>{k}</span><span>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#111827', borderTop: '1px solid #F3F4F6', marginTop: 8, paddingTop: 10 }}>
              <span>{tx.total}</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#C9956C' }}>{fmtMoney(final)} so'm</div>
              </div>
            </div>
          </div>

          <button onClick={placeOrder} disabled={placing || !address.trim()} style={{
            width: '100%', padding: 15, background: placing || !address.trim() ? '#9CA3AF' : '#C9956C',
            color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700,
            cursor: placing || !address.trim() ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(139,58,98,.25)',
          }}>
            {placing ? tx.placing : `✅ ${tx.order} — ${fmtMoney(final)} so'm`}
          </button>
        </div>
      )}
    </div>
  )
}

export function OrdersPage() {
  const { user, lang } = useStore()
  const nav = useNavigate()
  const tx = TXT[lang] || TXT.uz
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const STATUS = {
    new: { label: 'Yangi', color: '#C9956C', bg: '#FDF6F0', icon: '🆕' },
    processing: { label: 'Jarayonda', color: '#b45309', bg: '#fef3c7', icon: '⚙️' },
    shipped: { label: "Yo'lda", color: '#0369a1', bg: '#e0f2fe', icon: '🚚' },
    delivered: { label: 'Yetkazildi', color: '#16a34a', bg: '#dcfce7', icon: '✅' },
    cancelled: { label: 'Bekor', color: '#dc2626', bg: '#fee2e2', icon: '❌' },
    returned: { label: 'Qaytarildi', color: '#7c3aed', bg: '#ede9fe', icon: '↩️' },
  }

  useEffect(() => {
    if (!user) { setLoading(false); return }
    orderAPI.list({ customer_id: user.id, limit: 50 })
      .then(r => setOrders(r.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
      <div style={{ color: '#6B7280' }}>{tx.noAuth}</div>
    </div>
  )

  return (
    <div>
      <div style={{ background: '#1C1C1E', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{tx.orders}</span>
      </div>
      <div style={{ padding: 12 }}>
        {loading && (
          <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            {tx.loading}
          </div>
        )}
        {!loading && orders.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>📭</div>
            <div style={{ color: '#6B7280', marginBottom: 16 }}>{tx.noOrders}</div>
            <button onClick={() => nav('/catalog')} style={{ background: '#C9956C', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 28px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{tx.shop}</button>
          </div>
        )}
        {orders.map(o => {
          const st = STATUS[o.status] || STATUS.new
          const isOpen = selected === o.id
          return (
            <div key={o.id} onClick={() => setSelected(isOpen ? null : o.id)} style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6', padding: 14, marginBottom: 8, cursor: 'pointer', transition: 'box-shadow .15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{st.icon} Buyurtma #{o.id}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{o.created_at?.slice(0, 10)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 12, background: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#C9956C', marginTop: 4 }}>{fmtMoney(o.final_amount)} so'm</div>
                </div>
              </div>
              {isOpen && (
                <div style={{ marginTop: 12, borderTop: '0.5px solid #F3F4F6', paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                    <span>💳 To'lov:</span><span style={{ color: '#111827', fontWeight: 500 }}>{o.payment_method || '—'}</span>
                  </div>
                  {o.delivery_address && (
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                      📍 <span style={{ color: '#111827' }}>{o.delivery_address}</span>
                    </div>
                  )}
                  {o.delivery_phone && (
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                      📞 <span style={{ color: '#111827' }}>{o.delivery_name ? `${o.delivery_name} · ` : ''}{o.delivery_phone}</span>
                    </div>
                  )}
                  {o.estimated_delivery && (
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                      🕐 <span style={{ color: '#111827' }}>{o.estimated_delivery}</span>
                    </div>
                  )}
                  {(o.items || []).length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {o.items.slice(0, 3).map((it, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#4a3540', padding: '3px 0', borderBottom: '0.5px solid #faf5f8' }}>
                          {it.product_name || '—'} {it.size && `(${it.size})`} × {it.quantity} — {fmtMoney(it.subtotal)} so'm
                        </div>
                      ))}
                      {o.items.length > 3 && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>...va yana {o.items.length - 3} ta</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { user, lang, setLang, setUser, logout } = useStore()
  const tx = TXT[lang] || TXT.uz
  const nav = useNavigate()
  const [loyalty, setLoyalty] = useState(null)
  const [phone, setPhone] = useState('')
  const [editPhone, setEditPhone] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    setPhone(user.phone || '')
    loyaltyAPI.get(user.id)
      .then(setLoyalty)
      .catch(() => setLoyalty(null))
  }, [user?.id])

  async function changeLang(l) {
    setLang(l)
    if (user?.id) {
      try { await authAPI.updateLang(user.id, l) } catch {}
    }
  }

  async function savePhone() {
    if (!phone.trim() || !user?.id) return
    try {
      const updated = await authAPI.updateProfile(user.id, { phone: phone.trim() })
      if (updated?.id) setUser({ ...user, phone: updated.phone })
      setEditPhone(false)
    } catch {}
  }

  const LEVEL_LABELS = { bronze: '🥉 Bronze', silver: '🥈 Silver', gold: '🥇 Gold' }
  const LEVEL_COLORS = { bronze: '#b45309', silver: '#6b7280', gold: '#d97706' }
  const level = loyalty?.level || 'bronze'

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#1C1C1E,#B87333)', padding: '24px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {user?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{user?.full_name || 'Mehmon'}</div>
            {editPhone ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  style={{ flex: 1, border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 12 }}
                  placeholder="+998..." />
                <button onClick={savePhone} style={{ background: '#16a34a', border: 'none', color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>✓</button>
                <button onClick={() => setEditPhone(false)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                {user?.phone || tx.phone}
                <button onClick={() => setEditPhone(true)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}>✏️</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: 12 }}>
        {/* Loyalty card */}
        <div style={{ background: 'linear-gradient(135deg,#1C1C1E,#B87333)', borderRadius: 18, padding: 18, marginBottom: 10, color: '#fff', boxShadow: '0 4px 20px rgba(45,16,32,.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, opacity: .75, marginBottom: 4 }}>{tx.loyalty}</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>
                {loyalty ? (loyalty.points || 0).toLocaleString('ru-RU') : '—'}
                <span style={{ fontSize: 13, fontWeight: 400, opacity: .75, marginLeft: 4 }}>{tx.points}</span>
              </div>
              {loyalty?.discount_percent > 0 && (
                <div style={{ fontSize: 11, opacity: .8, marginTop: 2 }}>🏷 {loyalty.discount_percent}% chegirma</div>
              )}
            </div>
            <div style={{ background: LEVEL_COLORS[level] || '#b45309', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              {LEVEL_LABELS[level] || level}
            </div>
          </div>
          {loyalty?.next_level && (
            <>
              <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, height: 6, marginTop: 14 }}>
                <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 8, height: 6, width: `${loyalty.progress || 0}%`, transition: 'width .5s' }} />
              </div>
              <div style={{ fontSize: 10, opacity: .65, marginTop: 5 }}>
                {LEVEL_LABELS[loyalty.next_level]} → {loyalty.total_spent?.toLocaleString('ru-RU') || 0} / {loyalty.next_threshold?.toLocaleString('ru-RU')} so'm
              </div>
            </>
          )}
          {loyalty?.referral_code && (
            <div style={{ marginTop: 12, background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, opacity: .8 }}>🔗 Referral: <b>{loyalty.referral_code}</b></span>
              <button onClick={() => { navigator.clipboard?.writeText(loyalty.referral_code); }} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '3px 8px', fontSize: 10, cursor: 'pointer' }}>Nusxa</button>
            </div>
          )}
        </div>

        {/* Til */}
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6', padding: 14, marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 10 }}>{tx.langTitle}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['uz', "🇺🇿 O'zbek"], ['ru', '🇷🇺 Русский'], ['en', '🇬🇧 English']].map(([l, label]) => (
              <button key={l} onClick={() => changeLang(l)} style={{
                flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 10, cursor: 'pointer',
                border: lang === l ? '2px solid #C9956C' : '1px solid #F3F4F6',
                background: lang === l ? '#FDF6F0' : '#fafafa',
                color: lang === l ? '#C9956C' : '#6B7280',
                fontWeight: lang === l ? 700 : 400,
                transition: 'all .15s',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Menu */}
        {[
          ['📦', tx.myOrders, '/orders'],
          ['❤️', lang === 'ru' ? 'Избранное' : lang === 'en' ? 'Favorites' : 'Sevimlilar', '/favorites'],
          ['🔔', lang === 'ru' ? 'Уведомления' : lang === 'en' ? 'Notifications' : 'Bildirishnomalar', '/notifications'],
          ['🏪', lang === 'ru' ? 'Филиалы' : lang === 'en' ? 'Branches' : 'Filiallar', '/branches'],
          ['✨', 'Mix Stilist (AI)', '/ai'],
          ['🛍', lang === 'ru' ? 'Каталог' : lang === 'en' ? 'Catalog' : 'Katalog', '/catalog'],
        ].map(([icon, label, path]) => (
          <button key={path} onClick={() => nav(path)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px', background: '#fff',
            border: '0.5px solid #F3F4F6', borderRadius: 14, marginBottom: 8,
            cursor: 'pointer', textAlign: 'left',
          }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 13, color: '#111827', flex: 1 }}>{label}</span>
            <span style={{ color: '#9CA3AF', fontSize: 18 }}>›</span>
          </button>
        ))}

        {user?.id && (
          <div style={{ background: '#faf5f8', borderRadius: 14, padding: '12px 14px', textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            ID: {user.id} · {user.role || 'customer'}
          </div>
        )}

        <button
          onClick={() => { logout(); nav('/') }}
          style={{ width: '100%', padding: 14, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}
        >
          🚪 Chiqish
        </button>
      </div>
    </div>
  )
}

export default CartPage
