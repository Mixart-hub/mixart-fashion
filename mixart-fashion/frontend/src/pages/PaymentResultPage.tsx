import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { useSocket } from '../hooks/useSocket'
import Layout from '../components/Layout'
import Button from '../components/ui/Button'

type Status = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'checking'

export default function PaymentResultPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const orderId = params.get('orderId') ?? ''
  const provider = params.get('provider') ?? ''
  const [status, setStatus] = useState<Status>('checking')

  useSocket({
    'payment:confirmed': (d: any) => { if (d.orderId === orderId) setStatus('PAID') },
    'payment:failed':    (d: any) => { if (d.orderId === orderId) setStatus('FAILED') },
  })

  useEffect(() => {
    if (!orderId) return
    const poll = async () => {
      try {
        const data = await api.get<{ status: Status }>(`/payments/status/${orderId}`)
        if (data.status !== 'PENDING') setStatus(data.status)
      } catch {}
    }
    poll()
    const timer = setInterval(poll, 3000)
    return () => clearInterval(timer)
  }, [orderId])

  const display: Record<Status, { icon: string; title: string; desc: string; color: string }> = {
    checking: { icon: '⏳', title: "To'lov tekshirilmoqda...", desc: 'Biroz kuting', color: 'text-dark-muted' },
    PENDING:  { icon: '⏳', title: "To'lov kutilmoqda...",    desc: 'Bank javobi kutilmoqda', color: 'text-dark-muted' },
    PAID:     { icon: '✅', title: "To'lov muvaffaqiyatli!",  desc: 'Buyurtmangiz qabul qilindi', color: 'text-green-600' },
    FAILED:   { icon: '❌', title: "To'lov muvaffaqiyatsiz",  desc: "To'lov bekor qilindi yoki xato", color: 'text-red-500' },
    REFUNDED: { icon: '↩️', title: "To'lov qaytarildi",       desc: 'Mablag\' hisobingizga qaytarildi', color: 'text-amber-600' },
  }

  const { icon, title, desc, color } = display[status]

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <div className="card p-10">
            <p className="text-7xl mb-6">{icon}</p>
            <h2 className={`text-2xl font-serif font-semibold mb-2 ${color}`}>{title}</h2>
            <p className="text-dark-muted mb-2">{desc}</p>
            {orderId && (
              <p className="text-sm text-dark-muted mb-8">
                Buyurtma #{orderId.slice(0, 8)}
                {provider && ` · ${provider}`}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={`/orders/${orderId}`}>
                <Button variant="outline">{t('orders.details')}</Button>
              </Link>
              <Link to="/products">
                <Button>{t('cart.continue')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
