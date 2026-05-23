import { useEffect, useState } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const token = () => localStorage.getItem('adminToken') || ''

interface Order { id: string; status: string; total: number; user: { name: string }; createdAt: string }
const STATUSES = ['PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED']

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    fetch(`${BASE}/admin/orders`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setOrders)
  }, [])

  async function updateStatus(id: string, status: string) {
    await fetch(`${BASE}/admin/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status })
    })
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  return (
    <div>
      <h2>Orders</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr>{['ID','Customer','Total','Status','Action'].map(h => <th key={h} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td style={{ padding: 8 }}>#{o.id.slice(0, 8)}</td>
              <td style={{ padding: 8 }}>{o.user.name}</td>
              <td style={{ padding: 8 }}>{(o.total / 100).toLocaleString()} UZS</td>
              <td style={{ padding: 8 }}>{o.status}</td>
              <td style={{ padding: 8 }}>
                <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
