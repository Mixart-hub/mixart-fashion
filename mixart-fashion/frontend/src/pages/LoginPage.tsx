import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { useAuth } from '../store/auth'
import { useCart } from '../store/cart'
import Layout from '../components/Layout'
import Button from '../components/ui/Button'

type Tab = 'login' | 'register'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const { fetchCart } = useCart()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      setLoading(true)
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register'
      const body = tab === 'login' ? { email, password } : { name, email, password, phone }
      const data = await api.post<{ token: string; user: { id: string; name: string; role: string } }>(endpoint, body)
      login(data.token, data.user)
      await fetchCart()
      navigate('/')
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/">
              <span className="font-display text-4xl text-rose">Mixart</span>
              <span className="font-display text-4xl text-dark"> Fashion</span>
            </Link>
            <p className="text-dark-muted text-sm mt-2">Chiroyli kiyimlar — qulay xarid</p>
          </div>

          <div className="card p-8">
            {/* Tabs */}
            <div className="flex rounded-xl bg-cream-light p-1 mb-8">
              {(['login', 'register'] as Tab[]).map(t_ => (
                <button key={t_} onClick={() => { setTab(t_); setError('') }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${tab === t_ ? 'bg-white text-dark shadow-sm' : 'text-dark-muted hover:text-dark'}`}>
                  {t_ === 'login' ? t('auth.login') : t('auth.register')}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === 'register' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('auth.name')}</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="Ismingiz" className="input" required />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('auth.email')}</label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  type="email" placeholder="email@example.com" className="input" required />
              </div>
              {tab === 'register' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('auth.phone')}</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    type="tel" placeholder="+998 90 000 00 00" className="input" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('auth.password')}</label>
                <input value={password} onChange={e => setPassword(e.target.value)}
                  type="password" placeholder="••••••••" className="input" required minLength={6} />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
                {tab === 'login' ? t('auth.login') : t('auth.register')}
              </Button>
            </form>

            {/* Telegram */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-cream" />
              </div>
              <div className="relative flex justify-center text-xs text-dark-muted">
                <span className="bg-white px-3">yoki</span>
              </div>
            </div>

            <a href={`https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'mixartfashion_bot'}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-3 border-2 border-cream rounded-xl
                         hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium">
              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              {t('auth.telegram')}
            </a>
          </div>
        </div>
      </div>
    </Layout>
  )
}
