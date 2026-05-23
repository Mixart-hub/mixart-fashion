import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import Layout from '../components/Layout'
import Breadcrumb from '../components/ui/Breadcrumb'
import PriceDisplay from '../components/ui/PriceDisplay'
import OrderStatusBadge from '../components/OrderStatusBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'

interface Order {
  id: string; status: string; total: number; address?: string; notes?: string
  deliveryType: string; createdAt: string; updatedAt: string
  items: { id: string; quantity: number; price: number; size?: string; color?: string; product: { id: string; name: string; nameUz: string; nameRu: string; nameEn: string; images: string[] } }[]
  payment?: { provider: string; status: string; amount: number }
}

const STEPS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

export default function OrderDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const lang = i18n.language as 'uz' | 'ru' | 'en'

  useEffect(() => {
    if (!id) return
    api.get<Order>(`/orders/${id}`).then(setOrder).finally(() => setLoading(false))
  }, [id])

  if (loading) return <Layout><LoadingSpinner /></Layout>
  if (!order) return <Layout><div className="text-center py-20 text-dark-muted">Buyurtma topilmadi</div></Layout>

  const currentStep = STEPS.indexOf(order.status)
  const nameKey = { uz: 'nameUz', ru: 'nameRu', en: 'nameEn' }[lang] as 'nameUz' | 'nameRu' | 'nameEn'

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('orders.title'), href: '/orders' }, { label: `#${order.id.slice(0, 8)}` }]} />

        <div className="flex items-center justify-between mb-8">
          <h1 className="section-title">Buyurtma #{order.id.slice(0, 8)}</h1>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Progress */}
        {order.status !== 'CANCELLED' && (
          <div className="card p-6 mb-6">
            <h2 className="font-semibold mb-6">Buyurtma holati</h2>
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-cream">
                <div className="h-full bg-rose transition-all duration-500"
                  style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />
              </div>
              <div className="relative flex justify-between">
                {STEPS.map((step, i) => (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold z-10 transition-colors
                      ${i <= currentStep ? 'bg-rose text-white' : 'bg-cream text-dark-muted'}`}>
                      {i < currentStep ? '✓' : i + 1}
                    </div>
                    <span className="text-xs text-dark-muted mt-2 text-center w-16 leading-tight">
                      {t(`orders.status.${step}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold mb-4">Mahsulotlar</h2>
          <div className="space-y-4">
            {order.items.map(item => (
              <div key={item.id} className="flex gap-4">
                <Link to={`/products/${item.product.id}`}>
                  <img src={item.product.images?.[0] || '/placeholder.jpg'} alt=""
                    className="w-16 h-20 object-cover rounded-xl bg-cream-light" />
                </Link>
                <div className="flex-1">
                  <Link to={`/products/${item.product.id}`}>
                    <p className="font-medium text-dark hover:text-rose transition-colors">
                      {item.product[nameKey] || item.product.name}
                    </p>
                  </Link>
                  <div className="flex gap-2 mt-1">
                    {item.size && <span className="badge badge-rose">Razmer: {item.size}</span>}
                    {item.color && <span className="badge badge-rose">Rang: {item.color}</span>}
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-dark-muted">{item.quantity} dona</span>
                    <PriceDisplay price={item.price * item.quantity} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="card p-6">
          <div className="space-y-3 text-sm">
            {order.deliveryType === 'DELIVERY' && order.address && (
              <div className="flex justify-between">
                <span className="text-dark-muted">📍 Manzil</span>
                <span className="text-right max-w-xs">{order.address}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-dark-muted">📅 Sana</span>
              <span>{new Date(order.createdAt).toLocaleString('uz-UZ')}</span>
            </div>
            {order.payment && (
              <div className="flex justify-between">
                <span className="text-dark-muted">💳 To'lov</span>
                <span>{order.payment.provider} · {order.payment.status}</span>
              </div>
            )}
            {order.notes && (
              <div className="flex justify-between">
                <span className="text-dark-muted">📝 Izoh</span>
                <span className="text-right max-w-xs">{order.notes}</span>
              </div>
            )}
            <div className="border-t border-cream pt-3 flex justify-between font-bold text-base">
              <span>{t('cart.total')}</span>
              <PriceDisplay price={order.total} large />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
