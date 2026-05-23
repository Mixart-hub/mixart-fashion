import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/store'
import { notificationAPI } from '../../services/api'
import LoadingSpinner from '../common/LoadingSpinner'
import EmptyState from '../common/EmptyState'

const TXT = {
  uz: { title: 'Bildirishnomalar', empty: 'Bildirishnomalar yo\'q', loading: 'Yuklanmoqda...' },
  ru: { title: 'Уведомления', empty: 'Нет уведомлений', loading: 'Загрузка...' },
  en: { title: 'Notifications', empty: 'No notifications', loading: 'Loading...' },
}

export default function NotificationsPage() {
  const nav = useNavigate()
  const { user, lang } = useStore()
  const tx = TXT[lang] || TXT.uz
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    notificationAPI.list(user.id)
      .then(r => {
        const items = Array.isArray(r) ? r : []
        setNotifs(items)
        // Mark all unread as read
        items.filter(n => !n.is_read).forEach(n => {
          notificationAPI.markRead?.(n.id).catch(() => {})
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  function timeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return lang === 'ru' ? 'только что' : 'Hozirgina'
    if (mins < 60) return lang === 'ru' ? `${mins} мин назад` : `${mins} daqiqa oldin`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return lang === 'ru' ? `${hrs} ч назад` : `${hrs} soat oldin`
    return new Date(dateStr).toLocaleDateString('ru-RU')
  }

  return (
    <div>
      <div style={{ background: '#1C1C1E', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>🔔 {tx.title}</span>
      </div>

      <div style={{ padding: 12 }}>
        {loading ? (
          <LoadingSpinner text={tx.loading} />
        ) : notifs.length === 0 ? (
          <EmptyState emoji="🔕" title={tx.empty} />
        ) : (
          notifs.map(n => (
            <div key={n.id} style={{
              background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6',
              padding: 14, marginBottom: 8,
              opacity: n.is_read ? 0.7 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  {n.title && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>
                      {!n.is_read && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#C9956C', marginRight: 6, marginBottom: 1, verticalAlign: 'middle' }} />}
                      {n.title}
                    </div>
                  )}
                  {n.body && (
                    <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{n.body}</div>
                  )}
                </div>
                <div style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {timeAgo(n.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

