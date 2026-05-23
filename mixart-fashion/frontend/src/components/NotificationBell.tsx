import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuth } from '../store/auth'

interface Notification {
  id: string; type: string; title: string; body: string; isRead: boolean; createdAt: string
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications')
      .then(d => { setNotifications(d.notifications); setUnread(d.unreadCount) })
      .catch(() => {})
  }, [user])

  const markAllRead = async () => {
    await api.patch('/notifications/read-all')
    setUnread(0)
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  if (!user) return null

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="relative p-2 hover:bg-cream rounded-lg transition-colors">
        <svg className="w-6 h-6 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-cream rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-down">
          <div className="flex items-center justify-between px-4 py-3 border-b border-cream">
            <h3 className="font-semibold text-dark">Bildirishnomalar</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-rose hover:underline">
                Barchasini o'qildi deb belgilash
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-dark-muted py-8 text-sm">Bildirishnomalar yo'q</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-cream last:border-0 ${!n.isRead ? 'bg-rose-pale/30' : ''}`}>
                  <p className="font-medium text-sm text-dark">{n.title}</p>
                  <p className="text-xs text-dark-muted mt-0.5">{n.body}</p>
                  <p className="text-xs text-dark-muted mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
