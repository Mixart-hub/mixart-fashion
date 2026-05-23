import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../store/auth'
import { useCart } from '../store/cart'
import SearchBar from './SearchBar'
import CartDrawer from './CartDrawer'
import NotificationBell from './NotificationBell'
import LanguageSwitcher from './LanguageSwitcher'

export default function Navbar() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { totalItems } = useCart()
  const navigate = useNavigate()
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-rose' : 'text-dark hover:text-rose'}`

  return (
    <>
      <header className="sticky top-0 z-30 glass border-b border-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <span className="font-display text-2xl text-rose tracking-wider">Mixart</span>
              <span className="font-display text-2xl text-dark-muted tracking-wider"> Fashion</span>
            </Link>

            {/* Nav links — desktop */}
            <nav className="hidden md:flex items-center gap-6 ml-6">
              <NavLink to="/" end className={navClass}>{t('nav.home')}</NavLink>
              <NavLink to="/products" className={navClass}>{t('nav.catalog')}</NavLink>
              <NavLink to="/branches" className={navClass}>{t('nav.branches')}</NavLink>
            </nav>

            {/* Search */}
            <div className="hidden sm:flex flex-1 justify-center">
              <SearchBar />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 ml-auto">
              <LanguageSwitcher />
              <NotificationBell />

              {user && (
                <Link to="/wishlist" className="p-2 hover:bg-cream rounded-lg transition-colors">
                  <svg className="w-6 h-6 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </Link>
              )}

              {/* Cart */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 hover:bg-cream rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </button>

              {/* Profile/Login */}
              {user ? (
                <div className="relative group">
                  <button className="flex items-center gap-2 p-2 hover:bg-cream rounded-lg transition-colors">
                    <div className="w-8 h-8 bg-rose text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {user.name[0].toUpperCase()}
                    </div>
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-cream rounded-xl shadow-lg z-50
                                  invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all">
                    <Link to="/profile" className="block px-4 py-3 text-sm hover:bg-cream transition-colors rounded-t-xl">
                      {t('profile.title')}
                    </Link>
                    <Link to="/orders" className="block px-4 py-3 text-sm hover:bg-cream transition-colors">
                      {t('orders.title')}
                    </Link>
                    <button onClick={logout}
                      className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors rounded-b-xl">
                      {t('profile.logout')}
                    </button>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="btn-primary text-sm px-4 py-2 hidden sm:inline-flex">
                  {t('auth.login')}
                </Link>
              )}

              {/* Mobile menu */}
              <button
                className="md:hidden p-2"
                onClick={() => setMobileOpen(v => !v)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="sm:hidden pb-3">
            <SearchBar />
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-cream bg-white animate-slide-down">
            <nav className="flex flex-col px-4 py-3 gap-1">
              {[
                [t('nav.home'), '/'],
                [t('nav.catalog'), '/products'],
                [t('nav.branches'), '/branches'],
                ...(user ? [
                  [t('nav.orders'), '/orders'],
                  [t('nav.wishlist'), '/wishlist'],
                  [t('profile.title'), '/profile'],
                ] : [])
              ].map(([label, path]) => (
                <Link key={path} to={path!}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-dark hover:bg-cream rounded-xl transition-colors">
                  {label}
                </Link>
              ))}
              {!user && (
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="btn-primary text-center mt-2">{t('auth.login')}</Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
