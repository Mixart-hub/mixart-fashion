import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../../store/store'
import api from '../../services/api'

const TXT = {
  uz: {
    title: 'To\'lov',
    payme: '💳 Payme orqali to\'lash',
    click: '💳 Click orqali to\'lash',
    cash: '💵 Naqd to\'lov',
    back: 'Ortga',
    loading: 'Yuklanmoqda...',
    success: 'To\'lov muvaffaqiyatli!',
    error: 'To\'lov xatosi',
    processing: 'To\'lov tekshirilmoqda...',
    amount: 'To\'lov summasi:',
    orderId: 'Buyurtma raqami:',
    selectMethod: 'To\'lov usulini tanlang',
    pay: 'To\'lash',
  },
  ru: {
    title: 'Оплата',
    payme: '💳 Оплата через Payme',
    click: '💳 Оплата через Click',
    cash: '💵 Наличными',
    back: 'Назад',
    loading: 'Загрузка...',
    success: 'Оплата успешна!',
    error: 'Ошибка оплаты',
    processing: 'Проверка оплаты...',
    amount: 'Сумма оплаты:',
    orderId: 'Номер заказа:',
    selectMethod: 'Выберите способ оплаты',
    pay: 'Оплатить',
  },
  en: {
    title: 'Payment',
    payme: '💳 Pay via Payme',
    click: '💳 Pay via Click',
    cash: '💵 Cash payment',
    back: 'Back',
    loading: 'Loading...',
    success: 'Payment successful!',
    error: 'Payment error',
    processing: 'Verifying payment...',
    amount: 'Amount:',
    orderId: 'Order #:',
    selectMethod: 'Select payment method',
    pay: 'Pay',
  },
}

function fmtMoney(v) {
  return v ? Math.round(Number(v)).toLocaleString('ru-RU') : '0'
}

export default function PaymentPage() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { lang } = useStore()
  const tx = TXT[lang] || TXT.uz

  const orderId = params.get('order_id')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [method, setMethod] = useState('payme')
  const [paying, setPaying] = useState(false)
  const [status, setStatus] = useState(null) // 'success' | 'error' | null

  useEffect(() => {
    if (!orderId) { nav('/orders'); return }
    api.get(`/orders/${orderId}`)
      .then(setOrder)
      .catch(() => nav('/orders'))
      .finally(() => setLoading(false))
  }, [orderId])

  async function handlePay() {
    if (!orderId) return
    setPaying(true)
    try {
      const res = await api.post('/payments/create-link', { order_id: Number(orderId), method })
      if (res.url) {
        window.open(res.url, '_blank')
        setStatus('processing')
        // 5 soniya kutib status tekshirish
        setTimeout(async () => {
          try {
            const st = await api.get(`/payments/status/${orderId}`)
            if (st.payment_status === 'paid') {
              setStatus('success')
            } else {
              setStatus(null)
            }
          } catch { setStatus(null) }
        }, 5000)
      }
    } catch (e) {
      alert(e?.detail || tx.error)
    } finally {
      setPaying(false)
    }
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
      {tx.loading}
    </div>
  )

  if (status === 'success') return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>{tx.success}</div>
      <button onClick={() => nav('/orders')} style={{
        background: '#C9956C', color: '#fff', border: 'none',
        borderRadius: 12, padding: '12px 28px', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginTop: 16
      }}>📦 {TXT[lang]?.orders || 'Buyurtmalar'}</button>
    </div>
  )

  if (status === 'processing') return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <div style={{ fontSize: 15, color: '#6B7280' }}>{tx.processing}</div>
    </div>
  )

  return (
    <div>
      <div style={{ background: '#1C1C1E', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>💳 {tx.title}</span>
      </div>

      <div style={{ padding: 16 }}>
        {/* Order info */}
        {order && (
          <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6', padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#6B7280', fontSize: 12 }}>{tx.orderId}</span>
              <span style={{ fontWeight: 700, color: '#1C1C1E' }}>#{order.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B7280', fontSize: 12 }}>{tx.amount}</span>
              <span style={{ fontWeight: 700, color: '#C9956C', fontSize: 16 }}>{fmtMoney(order.final_amount)} so'm</span>
            </div>
          </div>
        )}

        {/* Method selection */}
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6', padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1C1C1E', marginBottom: 12 }}>{tx.selectMethod}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['payme', tx.payme, '🟦'],
              ['click', tx.click, '🟢'],
            ].map(([val, label, icon]) => (
              <button key={val} onClick={() => setMethod(val)} style={{
                padding: '12px 16px', borderRadius: 12, fontSize: 13, cursor: 'pointer',
                border: method === val ? '2px solid #C9956C' : '1px solid #F3F4F6',
                background: method === val ? '#FDF6F0' : '#fafafa',
                color: method === val ? '#C9956C' : '#1C1C1E',
                fontWeight: method === val ? 700 : 400,
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                {label}
                {method === val && <span style={{ marginLeft: 'auto', color: '#C9956C' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handlePay}
          disabled={paying}
          style={{
            width: '100%', padding: 15,
            background: paying ? '#9CA3AF' : '#C9956C',
            color: '#fff', border: 'none', borderRadius: 14,
            fontSize: 14, fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(139,58,98,.25)',
          }}
        >
          {paying ? '⏳ ...' : `💳 ${tx.pay}${order ? ` — ${fmtMoney(order.final_amount)} so'm` : ''}`}
        </button>
      </div>
    </div>
  )
}

