import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { useSocket } from '../hooks/useSocket'
import Layout from '../components/Layout'
import Breadcrumb from '../components/ui/Breadcrumb'
import PriceDisplay from '../components/ui/PriceDisplay'
import OrderStatusBadge from '../components/OrderStatusBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'

interface Order {
  id: string; status: string; total: number; createdAt: string; deliveryType: string
  items: { id: string; quantity: number; price: number; product: { name: string; nameUz: string; nameRu: string; nameEn: string } }[]
  payment?: { provider: string; status: string }
}

export default function OrdersPage() {
  const { t, i18n } = useTranslation()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const lang = i18n.language as 'uz' | 'ru' | 'en'

  const load = useCallback(() => {
    api.get<Order[]>('/orders').then(setOrders).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  useSocket({
    'order:updated': (d: any) => setOrders(prev => prev.map(o => o.id === d.id ? { ...o, status: d.status } : o)),
    'payment:confirmed': (d: any) => setOrders(prev => prev.map(o =>
      o.id === d.orderId ? { ...o, status: 'CONFIRMED', payment: { ...o.payment!, status: 'PAID' } } : o)),
  })

  const cancel = async (orderId: string) => {
    await api.post(`/orders/${orderId}/cancel`, {})
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o))
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('orders.title') }]} />
        <h1 className="section-title mb-8">{t('orders.title')}</h1>

        {loading ? <LoadingSpinner /> : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📦</p>
            <p className="text-dark-muted mb-6">{t('orders.empty')}</p>
            <Link to="/products" className="btn-primary">{t('cart.continue')}</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const nameKey = { uz: 'nameUz', ru: 'nameRu', en: 'nameEn' }[lang] as 'nameUz' | 'nameRu' | 'nameEn'
              return (
                <div key={order.id} className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="font-mono text-dark-muted text-sm">#{order.id.slice(0, 8)}</span>
                      <p className="text-xs text-dark-muted mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="space-y-2 mb-4 border-t border-b border-cream py-4">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-dark">{item.product[nameKey] || item.product.name} × {item.quantity}</span>
                        <PriceDisplay price={item.price * item.quantity} />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-dark-muted mb-1">
                        {order.deliveryType === 'DELIVERY' ? '🚚 Yetkazib berish' : '🏪 O\'zi olish'}
                      </p>
                      <PriceDisplay price={order.total} large />
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/orders/${order.id}`} className="btn-outline text-sm py-1.5 px-4">
                        {t('orders.details')}
                      </Link>
                      {order.status === 'PENDING' && (
                        <button onClick={() => cancel(order.id)}
                          className="text-sm text-red-400 hover:text-red-600 px-3 transition-colors">
                          {t('orders.cancel')}
                        </button>
                      )}
                    </div>
                  </div>

                  {order.payment && (
                    <p className="text-xs text-dark-muted mt-3 pt-3 border-t border-cream">
                      To'lov: {order.payment.provider} · {order.payment.status}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
