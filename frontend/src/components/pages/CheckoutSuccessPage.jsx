import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../../store/store'
import api from '../../services/api'

const TXT = {
  uz: {
    title: 'Buyurtma qabul qilindi!',
    sub: 'Buyurtmangiz muvaffaqiyatli joylashtirildi. Tez orada siz bilan bog\'lanamiz.',
    orderId: 'Buyurtma raqami',
    amount: 'To\'lov summasi',
    method: 'To\'lov usuli',
    status: 'Holat',
    payNow: '💳 Hozir to\'lash',
    myOrders: '📦 Buyurtmalarim',
    continue: '🛍 Xarid davom ettirish',
    processing: 'Jarayonda',
  },
  ru: {
    title: 'Заказ принят!',
    sub: 'Ваш заказ успешно оформлен. Скоро свяжемся с вами.',
    orderId: 'Номер заказа',
    amount: 'Сумма',
    method: 'Способ оплаты',
    status: 'Статус',
    payNow: '💳 Оплатить сейчас',
    myOrders: '📦 Мои заказы',
    continue: '🛍 Продолжить покупки',
    processing: 'В обработке',
  },
  en: {
    title: 'Order placed!',
    sub: 'Your order has been successfully placed. We will contact you soon.',
    orderId: 'Order ID',
    amount: 'Amount',
    method: 'Payment method',
    status: 'Status',
    payNow: '💳 Pay now',
    myOrders: '📦 My Orders',
    continue: '🛍 Continue shopping',
    processing: 'Processing',
  },
}

const PAYMENT_METHODS = {
  payme: 'Payme',
  click: 'Click',
  cash: 'Naqd / Наличные / Cash',
  uzum: 'Uzum',
}

function fmtMoney(v) {
  return v ? Math.round(Number(v)).toLocaleString('ru-RU') : '0'
}

export default function CheckoutSuccessPage() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { lang } = useStore()
  const tx = TXT[lang] || TXT.uz
  const orderId = params.get('order_id')
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (orderId) {
      api.get(`/orders/${orderId}`).then(setOrder).catch(() => {})
    }
  }, [orderId])

  const needsPayment = order && order.payment_method !== 'cash' && order.payment_status !== 'paid'

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
      {/* Success animation */}
      <div style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 28 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'linear-gradient(135deg,#16a34a,#22c55e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44, margin: '0 auto 20px',
          boxShadow: '0 8px 24px rgba(22,163,74,.3)',
        }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E', marginBottom: 8 }}>{tx.title}</div>
        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{tx.sub}</div>
      </div>

      {/* Order details */}
      {order && (
        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #F3F4F6', padding: 18, marginBottom: 16 }}>
          {[
            [tx.orderId, `#${order.id}`],
            [tx.amount, `${fmtMoney(order.final_amount)} so'm`],
            [tx.method, PAYMENT_METHODS[order.payment_method] || order.payment_method || '—'],
            [tx.status, tx.processing],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #f9f0f5', fontSize: 13 }}>
              <span style={{ color: '#6B7280' }}>{k}</span>
              <span style={{ fontWeight: 600, color: '#1C1C1E' }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {needsPayment && (
          <button
            onClick={() => nav(`/payment?order_id=${order.id}`)}
            style={{
              width: '100%', padding: 14,
              background: '#C9956C', color: '#fff',
              border: 'none', borderRadius: 14, fontSize: 14,
              fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(139,58,98,.25)',
            }}
          >{tx.payNow}</button>
        )}
        <button
          onClick={() => nav('/orders')}
          style={{
            width: '100%', padding: 13,
            background: '#f3edf0', color: '#C9956C',
            border: 'none', borderRadius: 14, fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}
        >{tx.myOrders}</button>
        <button
          onClick={() => nav('/')}
          style={{
            width: '100%', padding: 13,
            background: 'none', color: '#6B7280',
            border: '1px solid #F3F4F6', borderRadius: 14, fontSize: 13,
            cursor: 'pointer',
          }}
        >{tx.continue}</button>
      </div>
    </div>
  )
}

