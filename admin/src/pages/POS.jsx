import React, { useState, useEffect, useRef, useCallback } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import { Search, Plus, Minus, Trash2, ShoppingCart, Tag, CreditCard, Banknote, CheckCircle2, X, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsAPI } from '../services/api'
import { formatPrice } from '../utils/formatters'
import api from '../services/api'

const MEDIA_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')

function getImg(images) {
  const img = Array.isArray(images) ? images[0] : null
  if (!img) return null
  return img.startsWith('http') ? img : `${MEDIA_BASE}/media/${img}`
}

export default function POS() {
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [cart, setCart]           = useState([])
  const [promo, setPromo]         = useState('')
  const [promoData, setPromoData] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [payment, setPayment]     = useState('cash')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [placing, setPlacing]     = useState(false)
  const [success, setSuccess]     = useState(null)
  const searchTimer = useRef()

  const load = useCallback((q = '') => {
    setLoading(true)
    productsAPI.list({ search: q, limit: 40 })
      .then(r => setProducts(r.products || r.data || []))
      .catch(() => toast.error('Yuklanmadi'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function handleSearch(q) {
    setSearch(q)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(q), 400)
  }

  function addToCart(product) {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
  }

  function changeQty(id, delta) {
    setCart(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
      return updated.filter(i => i.qty > 0)
    })
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(i => i.id !== id))
  }

  async function applyPromo() {
    if (!promo.trim()) return
    setPromoLoading(true)
    try {
      const r = await api.get(`/promo/check/${promo.trim()}`)
      if (r.valid) {
        setPromoData(r)
        toast.success(`${r.discount_percent}% chegirma qo'llanildi`)
      } else {
        toast.error(r.message || 'Promo kod noto\'g\'ri')
        setPromoData(null)
      }
    } catch { toast.error('Xato') }
    finally { setPromoLoading(false) }
  }

  const subtotal  = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const discount  = promoData ? Math.round(subtotal * promoData.discount_percent / 100) : 0
  const total     = subtotal - discount

  async function placeOrder() {
    if (!cart.length) return toast.error('Savatcha bo\'sh')
    setPlacing(true)
    try {
      const payload = {
        items: cart.map(i => ({ product_id: i.id, quantity: i.qty, price: i.price, size: '', color: '' })),
        total_amount: subtotal,
        delivery_amount: 0,
        promo_code: promoData ? promo.trim() : null,
        customer_name: customerName || 'Kassa mijozi',
        customer_phone: customerPhone || null,
        payment_method: payment,
      }
      const order = await api.post('/admin/pos/order', payload)
      setSuccess({ id: order.id, total })
      setCart([])
      setPromo(''); setPromoData(null)
      setCustomerName(''); setCustomerPhone('')
    } catch (e) {
      toast.error(e?.detail || 'Xato yuz berdi')
    } finally { setPlacing(false) }
  }

  if (success) {
    return (
      <AdminLayout>
        <AdminHeader title="Kassa (POS)" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center border border-gray-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Buyurtma qabul qilindi!</h2>
            <div className="text-sm text-gray-500 mb-1">ID: <span className="font-mono font-semibold text-gray-800">{success.id}</span></div>
            <div className="text-2xl font-bold text-primary mt-3 mb-6">{formatPrice(success.total)}</div>
            <button
              onClick={() => setSuccess(null)}
              className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90"
            >
              Yangi savdo
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <AdminHeader title="Kassa (POS)" />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>

        {/* ── LEFT: Product search + grid ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col border-r border-gray-100 overflow-hidden">
          {/* Search bar */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Mahsulot qidirish (nomi)..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Products grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="grid grid-cols-3 gap-3">
                {Array(9).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 animate-pulse overflow-hidden">
                    <div className="h-28 bg-gray-100" />
                    <div className="p-2.5 space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <Package size={48} className="text-gray-200" />
                <p className="text-sm">Mahsulot topilmadi</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {products.map(p => {
                  const imgUrl = getImg(p.images)
                  const inCart = cart.find(i => i.id === p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className={`bg-white rounded-xl border text-left overflow-hidden hover:shadow-md transition-shadow relative ${inCart ? 'border-primary/50 ring-1 ring-primary/20' : 'border-gray-100'}`}
                    >
                      <div className="h-28 bg-gray-50 flex items-center justify-center overflow-hidden">
                        {imgUrl
                          ? <img src={imgUrl} alt={p.name_uz} className="w-full h-full object-cover" />
                          : <Package size={28} className="text-gray-200" />
                        }
                      </div>
                      {inCart && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                          {inCart.qty}
                        </div>
                      )}
                      <div className="p-2.5">
                        <div className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug">{p.name_uz}</div>
                        <div className="text-sm font-bold text-primary mt-1">{formatPrice(p.price)}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart + checkout ───────────────────────────────────────── */}
        <div className="w-80 flex flex-col bg-gray-50">
          {/* Cart header */}
          <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <ShoppingCart size={16} className="text-primary" />
            <span className="font-semibold text-gray-900 text-sm">Savatcha</span>
            {cart.length > 0 && (
              <span className="ml-auto text-xs bg-primary text-white px-2 py-0.5 rounded-full">{cart.length}</span>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-12">
                <ShoppingCart size={36} className="text-gray-200" />
                <p className="text-xs">Mahsulot qo'shing</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-2 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">{item.name_uz}</div>
                      <div className="text-xs text-primary font-bold mt-0.5">{formatPrice(item.price)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => changeQty(item.id, -1)} className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                        <Minus size={11} />
                      </button>
                      <span className="text-sm font-bold text-gray-900 w-5 text-center">{item.qty}</span>
                      <button onClick={() => changeQty(item.id, +1)} className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                        <Plus size={11} />
                      </button>
                      <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 ml-1">
                        <Trash2 size={11} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout panel */}
          <div className="border-t border-gray-200 bg-white p-4 space-y-3">
            {/* Customer info */}
            <div className="grid grid-cols-2 gap-2">
              <input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Mijoz ismi"
                className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
              <input
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="+998..."
                className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            {/* Promo */}
            <div className="flex gap-1.5">
              <div className="flex-1 relative">
                <Tag size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={promo}
                  onChange={e => { setPromo(e.target.value.toUpperCase()); setPromoData(null) }}
                  placeholder="Promo kod"
                  className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-primary font-mono"
                />
              </div>
              <button
                onClick={applyPromo}
                disabled={promoLoading || !promo.trim()}
                className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg font-medium disabled:opacity-50 hover:opacity-90"
              >
                {promoLoading ? '...' : 'OK'}
              </button>
              {promoData && (
                <button onClick={() => { setPromo(''); setPromoData(null) }} className="px-2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Payment method */}
            <div className="flex gap-1.5">
              {[
                { value: 'cash', label: 'Naqd', icon: Banknote },
                { value: 'card', label: 'Karta', icon: CreditCard },
                { value: 'transfer', label: 'O\'tkazma', icon: CreditCard },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPayment(opt.value)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                    payment === opt.value ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-primary/40'
                  }`}
                >
                  <opt.icon size={13} />
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Jami</span>
                <span className="font-medium text-gray-800">{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Chegirma ({promoData?.discount_percent}%)</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-1.5 font-bold text-sm">
                <span className="text-gray-900">To'lov</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Place order button */}
            <button
              onClick={placeOrder}
              disabled={placing || !cart.length}
              className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={15} />
              {placing ? 'Saqlanmoqda...' : 'Sotuvni yakunlash'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
