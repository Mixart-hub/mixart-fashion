import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { orderAPI } from '../../services/api'
import { useStore } from '../../store/store'
import useSSE from '../../hooks/useSSE'

const STATUS = {
  new:        { label: 'Yangi',      color: '#C9956C', bg: '#FDF6F0' },
  processing: { label: 'Jarayonda', color: '#b45309', bg: '#fef3c7' },
  shipped:    { label: "Yo'lda",    color: '#0369a1', bg: '#e0f2fe' },
  delivered:  { label: 'Yetkazildi',color: '#16a34a', bg: '#dcfce7' },
  cancelled:  { label: 'Bekor',     color: '#dc2626', bg: '#fee2e2' },
  returned:   { label: 'Qaytarildi',color: '#7c3aed', bg: '#ede9fe' },
}

export default function OrdersPage() {
  const { user } = useStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    orderAPI.list({ customer_id: user.id, limit: 50 })
      .then(r => setOrders(r.items || []))
      .finally(() => setLoading(false))
  }, [user])

  // Real-time: buyurtma statusini refresh qilmasdan yangilaymiz
  useSSE({
    order_updated: (data) => {
      setOrders(prev => {
        const updated = prev.map(o =>
          String(o.id) === String(data.id)
            ? { ...o, ...(data.status && { status: data.status }), ...(data.payment_status && { payment_status: data.payment_status }) }
            : o
        )
        const changed = updated.find(o => String(o.id) === String(data.id))
        if (changed && data.status) {
          const st = STATUS[data.status]
          toast.success(`Buyurtma #${data.id} — ${st?.label || data.status}`)
        }
        return updated
      })
    },
  }, !!user)

  return (
    <div>
      <div style={{ background: '#1C1C1E', padding: '14px 16px' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>📦 Buyurtmalarim</span>
      </div>
      <div style={{ padding: 12 }}>
        {loading && <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Yuklanmoqda...</div>}
        {!loading && orders.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ color: '#6B7280', fontSize: 13 }}>Hali buyurtma yo'q</div>
          </div>
        )}
        {orders.map(o => {
          const st = STATUS[o.status] || STATUS.new
          return (
            <div key={o.id} style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #F3F4F6', padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1C1C1E' }}>Buyurtma #{o.id}</div>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.color, fontWeight: 500 }}>{st.label}</span>
              </div>
              <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 4 }}>{o.created_at?.slice(0,16).replace('T',' ')}</div>
              {o.delivery_address && <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 4 }}>📍 {o.delivery_address}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTop: '0.5px solid #f9f0f5' }}>
                <span style={{ fontSize: 10, color: '#6B7280' }}>💳 {o.payment_method || 'Noma\'lum'} · {o.payment_status === 'paid' ? '✅ To\'langan' : '⏳ Kutilmoqda'}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#C9956C' }}>{Math.round(o.final_amount || 0).toLocaleString('ru-RU')} so'm</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

