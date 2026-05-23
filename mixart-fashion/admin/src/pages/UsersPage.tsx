import { useEffect, useState } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const token = () => localStorage.getItem('adminToken') || ''

interface User { id: string; name: string; email?: string; phone?: string; role: string; createdAt: string }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    fetch(`${BASE}/admin/users`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setUsers)
  }, [])

  return (
    <div>
      <h2>Users ({users.length})</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr>{['Name','Email','Phone','Role','Joined'].map(h => <th key={h} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td style={{ padding: 8 }}>{u.name}</td>
              <td style={{ padding: 8 }}>{u.email || '—'}</td>
              <td style={{ padding: 8 }}>{u.phone || '—'}</td>
              <td style={{ padding: 8 }}>{u.role}</td>
              <td style={{ padding: 8 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
