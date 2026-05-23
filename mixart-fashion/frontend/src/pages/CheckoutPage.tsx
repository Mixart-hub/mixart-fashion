import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { useCart } from '../store/cart'
import { useToast } from '../store/toast'
import Layout from '../components/Layout'
import Breadcrumb from '../components/ui/Breadcrumb'
import PriceDisplay from '../components/ui/PriceDisplay'
import Button from '../components/ui/Button'

interface Branch { id: string; nameUz: string; nameRu: string; nameEn: string; address: string; city: string }

type PaymentProvider = 'PAYME' | 'CLICK' | 'CASH'
type DeliveryType = 'DELIVERY' | 'PICKUP'

export default function CheckoutPage() {
  const { t, i18n } = useTranslation()
  const { cart, totalPrice, clearCart } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const lang = i18n.language as 'uz' | 'ru' | 'en'

  const [branches, setBranches] = useState<Branch[]>([])
  const [delivery, setDelivery] = useState<DeliveryType>('DELIVERY')
  const [address, setAddress] = useState('')
  const [branchId, setBranchId] = useState('')
  const [payment, setPayment] = useState<PaymentProvider>('CLICK')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get<Branch[]>('/inventory/branches').then(setBranches).catch(() => {})
  }, [])

  const nameKey = { uz: 'nameUz', ru: 'nameRu', en: 'nameEn' }[lang] as keyof Branch

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cart?.items.length) return
    if (delivery === 'DELIVERY' && !address.trim()) {
      showToast('Manzilni kiriting', 'error'); return
    }
    if (delivery === 'PICKUP' && !branchId) {
      showToast('Filialni tanlang', 'error'); return
    }
    try {
      setLoading(true)
      const items = cart.items.map(i => ({
        productId: i.productId, quantity: i.quantity, size: i.size, color: i.color
      }))
      const order = await api.post<{ id: string }>('/orders', {
        items, address: delivery === 'DELIVERY' ? address : undefined,
        branchId: delivery === 'PICKUP' ? branchId : undefined,
        deliveryType: delivery, payment, notes
      })

      if (payment !== 'CASH') {
        const payRes = await api.post<{ url?: string }>('/payments/initiate', {
          orderId: order.id, provider: payment
        })
        if (payRes.url) { window.location.href = payRes.url; return }
      }

      await clearCart()
      showToast(t('checkout.order_success'), 'success')
      navigate(`/orders/${order.id}`)
    } catch (err: any) {
      showToast(err.message || t('common.error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!cart?.items.length) return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🛍</p>
        <p className="text-dark-muted mb-6">{t('cart.empty')}</p>
        <Button onClick={() => navigate('/products')}>{t('cart.continue')}</Button>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('cart.title'), href: '/cart' }, { label: t('checkout.title') }]} />
        <h1 className="section-title mb-8">{t('checkout.title')}</h1>

        <form onSubmit={handleOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery type */}
            <div className="card p-6">
              <h2 className="font-semibold text-lg mb-4">Yetkazib berish usuli</h2>
              <div className="grid grid-cols-2 gap-3">
                {(['DELIVERY', 'PICKUP'] as DeliveryType[]).map(type => (
                  <button key={type} type="button" onClick={() => setDelivery(type)}
                    className={`p-4 rounded-xl border-2 text-left transition-colors ${delivery === type ? 'border-rose bg-rose-pale' : 'border-cream hover:border-rose'}`}>
                    <p className="font-semibold text-sm">{type === 'DELIVERY' ? '🚚 ' + t('checkout.delivery') : '🏪 ' + t('checkout.pickup')}</p>
                    <p className="text-xs text-dark-muted mt-1">
                      {type === 'DELIVERY' ? 'Manzilingizga yetkazamiz' : 'Filialdan olib ketasiz'}
                    </p>
                  </button>
                ))}
              </div>

              {delivery === 'DELIVERY' ? (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">{t('checkout.address')}</label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)}
                    placeholder="Ko'cha, uy, xonadon raqami..." rows={2}
                    className="input resize-none" required />
                </div>
              ) : (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">{t('checkout.branch')}</label>
                  <select value={branchId} onChange={e => setBranchId(e.target.value)} className="input" required>
                    <option value="">Filialni tanlang</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b[nameKey] as string} — {b.address}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="card p-6">
              <h2 className="font-semibold text-lg mb-4">{t('checkout.payment')}</h2>
              <div className="grid grid-cols-3 gap-3">
                {(['CLICK', 'PAYME', 'CASH'] as PaymentProvider[]).map(p => (
                  <button key={p} type="button" onClick={() => setPayment(p)}
                    className={`p-4 rounded-xl border-2 text-center transition-colors ${payment === p ? 'border-rose bg-rose-pale' : 'border-cream hover:border-rose'}`}>
                    <p className="text-lg mb-1">
                      {p === 'CLICK' ? '⚡' : p === 'PAYME' ? '💳' : '💵'}
                    </p>
                    <p className="font-semibold text-sm">{t(`checkout.${p.toLowerCase()}`)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="card p-6">
              <label className="block font-semibold mb-2">{t('checkout.notes')}</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Qo'shimcha izoh..." rows={2}
                className="input resize-none" />
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="card p-6 sticky top-24">
              <h2 className="font-serif text-xl font-semibold mb-6">Buyurtma</h2>
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {cart.items.map(item => {
                  const name = { uz: item.product.nameUz, ru: item.product.nameRu, en: item.product.nameEn }[lang] || item.product.name
                  return (
                    <div key={item.id} className="flex justify-between text-sm gap-2">
                      <span className="text-dark-muted line-clamp-1">{name} × {item.quantity}</span>
                      <PriceDisplay price={item.product.price * item.quantity} />
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-cream pt-4 mb-6">
                <div className="flex justify-between font-bold text-lg">
                  <span>{t('cart.total')}</span>
                  <PriceDisplay price={totalPrice} large />
                </div>
              </div>
              <Button type="submit" loading={loading} size="lg" className="w-full">
                {t('checkout.place_order')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  )
}
