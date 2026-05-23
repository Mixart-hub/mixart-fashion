import React, { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { authAPI } from './services/api'
import { useStore } from './store/store'
import BottomNav from './components/layout/BottomNav'
import LoadingSpinner from './components/common/LoadingSpinner'

const HomePage            = lazy(() => import('./components/pages/HomePage'))
const CatalogPage         = lazy(() => import('./components/pages/CatalogPage'))
const ProductPage         = lazy(() => import('./components/pages/ProductPage'))
const LazyCartPage        = lazy(() => import('./components/pages/CartPage').then(m => ({ default: m.CartPage })))
const LazyOrdersPage      = lazy(() => import('./components/pages/CartPage').then(m => ({ default: m.OrdersPage })))
const LazyProfilePage     = lazy(() => import('./components/pages/CartPage').then(m => ({ default: m.ProfilePage })))
const AIStilPage          = lazy(() => import('./components/pages/AIStilPage'))
const FavoritesPage       = lazy(() => import('./components/pages/FavoritesPage'))
const PaymentPage         = lazy(() => import('./components/pages/PaymentPage'))
const CheckoutSuccessPage = lazy(() => import('./components/pages/CheckoutSuccessPage'))
const BranchesPage        = lazy(() => import('./components/pages/BranchesPage'))
const NotificationsPage   = lazy(() => import('./components/pages/NotificationsPage'))
const NewsPage            = lazy(() => import('./components/pages/NewsPage'))

const HIDE_NAV_PATHS = ['/product', '/payment', '/checkout-success']

export default function App() {
  const { token, setUser, setToken, setLang } = useStore()
  const location = useLocation()

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      if (tg.colorScheme === 'dark') {
        document.body.style.background = '#1a0a12'
      }
    }

    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/system/currency-rate`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.usd_to_uzs) window.__USD_RATE__ = d.usd_to_uzs })
      .catch(() => {})

    const urlParams = new URLSearchParams(window.location.search)
    const googleToken = urlParams.get('google_token')
    if (googleToken) {
      localStorage.setItem('token', googleToken)
      setToken(googleToken)
      window.history.replaceState({}, '', window.location.pathname)
    }

    const initUser = async () => {
      try {
        const tgUser = tg?.initDataUnsafe?.user
        const effectiveToken = googleToken || token
        if (tgUser) {
          const tgLang = ['ru', 'en'].includes(tgUser.language_code) ? tgUser.language_code : 'uz'
          const res = await authAPI.telegram(
            String(tgUser.id),
            [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' '),
            tgLang,
          )
          if (res?.access_token) {
            localStorage.setItem('token', res.access_token)
            setToken(res.access_token)
            const me = await authAPI.me()
            setUser(me)
            if (me?.language) setLang(me.language)
          }
        } else if (effectiveToken) {
          const me = await authAPI.me()
          setUser(me)
          if (me?.language) setLang(me.language)
        }
      } catch (e) {
        console.error('Auth error:', e)
      }
    }
    initUser()
  }, [])

  const hidNav = HIDE_NAV_PATHS.some(p => location.pathname.startsWith(p))

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', minHeight: '100vh',
      background: '#F8F8F8',
      paddingBottom: hidNav ? 0 : 72,
      position: 'relative',
    }}>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '12px', fontSize: '14px', maxWidth: '340px' },
          success: { iconTheme: { primary: '#C9956C', secondary: '#fff' } },
        }}
      />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/"                 element={<HomePage />} />
          <Route path="/catalog"          element={<CatalogPage />} />
          <Route path="/product/:id"      element={<ProductPage />} />
          <Route path="/cart"             element={<LazyCartPage />} />
          <Route path="/orders"           element={<LazyOrdersPage />} />
          <Route path="/profile"          element={<LazyProfilePage />} />
          <Route path="/ai"               element={<AIStilPage />} />
          <Route path="/favorites"        element={<FavoritesPage />} />
          <Route path="/payment"          element={<PaymentPage />} />
          <Route path="/checkout-success" element={<CheckoutSuccessPage />} />
          <Route path="/branches"         element={<BranchesPage />} />
          <Route path="/notifications"    element={<NotificationsPage />} />
          <Route path="/news"            element={<NewsPage />} />
        </Routes>
      </Suspense>
      {!hidNav && <BottomNav />}
    </div>
  )
}
