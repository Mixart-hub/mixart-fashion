import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/store'
import api from '../../services/api'
import LoadingSpinner from '../common/LoadingSpinner'
import EmptyState from '../common/EmptyState'

const TXT = {
  uz: { title: 'Filiallar', call: 'Qo\'ng\'iroq', map: 'Xaritada', loading: 'Yuklanmoqda...' },
  ru: { title: 'Филиалы', call: 'Позвонить', map: 'На карте', loading: 'Загрузка...' },
  en: { title: 'Branches', call: 'Call', map: 'Map', loading: 'Loading...' },
}

export default function BranchesPage() {
  const nav = useNavigate()
  const { lang } = useStore()
  const tx = TXT[lang] || TXT.uz
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/settings/branches')
      .then(r => setBranches(Array.isArray(r) ? r : r.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ background: '#1C1C1E', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>🏪 {tx.title}</span>
      </div>

      <div style={{ padding: 12 }}>
        {loading ? (
          <LoadingSpinner text={tx.loading} />
        ) : branches.length === 0 ? (
          <EmptyState emoji="🏪" title={tx.title} subtitle="" />
        ) : (
          branches.map(b => (
            <div key={b.id} style={{
              background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6',
              padding: 16, marginBottom: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>
                    🏪 {b.name}
                  </div>
                  {b.address && (
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                      📍 {b.address}
                    </div>
                  )}
                  {b.phone && (
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                      📞 <a href={`tel:${b.phone}`} style={{ color: '#C9956C', textDecoration: 'none', fontWeight: 600 }}>{b.phone}</a>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {b.phone && (
                      <a href={`tel:${b.phone}`} style={{
                        padding: '7px 16px', background: '#C9956C', color: '#fff',
                        borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none',
                      }}>📞 {tx.call}</a>
                    )}
                    {b.latitude && b.longitude && (
                      <a
                        href={`https://maps.google.com?q=${b.latitude},${b.longitude}`}
                        target="_blank" rel="noreferrer"
                        style={{
                          padding: '7px 16px', background: '#f3edf0', color: '#C9956C',
                          borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none',
                        }}
                      >🗺 {tx.map}</a>
                    )}
                  </div>
                </div>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: b.is_active ? '#16a34a' : '#dc2626',
                  marginTop: 4, flexShrink: 0
                }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

