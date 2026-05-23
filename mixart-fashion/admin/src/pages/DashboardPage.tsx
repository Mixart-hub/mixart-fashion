import { useEffect, useState } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const token = () => localStorage.getItem('adminToken') || ''

export default function DashboardPage() {
  const [stats, setStats] = useState<{ users: number; orders: number; revenue: number } | null>(null)

  useEffect(() => {
    fetch(`${BASE}/admin/stats`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setStats)
  }, [])

  return (
    <div>
      <h2>Dashboard</h2>
      {stats && (
        <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
          {[['Users', stats.users], ['Orders', stats.orders], ['Revenue (UZS)', (stats.revenue / 100).toLocaleString()]].map(([label, val]) => (
            <div key={label as string} style={{ background: '#f5f5f5', borderRadius: 8, padding: 24, flex: 1 }}>
              <div style={{ color: '#888', fontSize: 13 }}>{label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>{val}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
