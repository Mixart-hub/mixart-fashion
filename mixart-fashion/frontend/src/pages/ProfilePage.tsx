import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../store/auth'
import { api } from '../api/client'
import { useToast } from '../store/toast'
import Layout from '../components/Layout'
import Breadcrumb from '../components/ui/Breadcrumb'
import LoyaltyCard from '../components/LoyaltyCard'
import Button from '../components/ui/Button'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await api.patch('/auth/profile', { name })
      setEditing(false)
      showToast('Profil yangilandi ✓', 'success')
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('profile.title') }]} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile info */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="section-title text-2xl">{t('profile.title')}</h1>
              <button onClick={() => setEditing(v => !v)} className="text-rose text-sm hover:underline">
                {editing ? t('common.cancel') : t('profile.edit')}
              </button>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 bg-rose text-white rounded-full flex items-center justify-center text-3xl font-serif font-bold mb-3">
                {user?.name[0]?.toUpperCase()}
              </div>
              <p className="font-semibold text-lg">{user?.name}</p>
              <p className="text-sm text-dark-muted">{user?.role === 'ADMIN' ? '👑 Admin' : '👤 Mijoz'}</p>
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('profile.name')}</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="input" required />
                </div>
                <Button type="submit" loading={saving} className="w-full">{t('profile.save')}</Button>
              </form>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-cream">
                  <span className="text-dark-muted">{t('profile.name')}</span>
                  <span className="font-medium">{user?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-cream">
                  <span className="text-dark-muted">{t('profile.email')}</span>
                  <span className="font-medium">{user?.email || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-cream">
                  <span className="text-dark-muted">{t('profile.phone')}</span>
                  <span className="font-medium">{user?.phone || '—'}</span>
                </div>
              </div>
            )}

            <button onClick={logout} className="w-full mt-6 text-red-400 hover:text-red-600 text-sm py-2 transition-colors">
              {t('profile.logout')} →
            </button>
          </div>

          {/* Loyalty */}
          <div>
            <LoyaltyCard />
          </div>
        </div>
      </div>
    </Layout>
  )
}
