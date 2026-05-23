import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, Package, Grid3x3, Users,
  Tag, Megaphone, BarChart2, Settings, UserCog, Activity,
  Warehouse, ChevronRight, Crown, LogOut, Building2, Monitor
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const ALL_NAV = [
  { icon: LayoutDashboard, label: 'Boshqaruv paneli', path: '/',           roles: null },
  { icon: ShoppingBag,     label: 'Buyurtmalar',       path: '/orders',     roles: null },
  { icon: Package,         label: 'Mahsulotlar',       path: '/products',   roles: null },
  { icon: Grid3x3,         label: 'Kategoriyalar',     path: '/categories', roles: ['admin','super_admin'] },
  { icon: Users,           label: 'Mijozlar',          path: '/customers',  roles: ['admin','super_admin','branch_manager'] },
  { icon: Warehouse,       label: 'Ombor',             path: '/inventory',  roles: null },
  { icon: Monitor,         label: 'Kassa (POS)',        path: '/pos',        roles: null },
  { icon: Building2,       label: 'Filiallar',          path: '/branches',   roles: ['admin','super_admin','branch_manager'] },
  { icon: Tag,             label: 'Chegirmalar',       path: '/discounts',  roles: ['admin','super_admin'] },
  { icon: Megaphone,       label: 'Marketing',         path: '/marketing',  roles: ['admin','super_admin'] },
  { icon: BarChart2,       label: 'Hisobotlar',        path: '/reports',    roles: ['admin','super_admin','branch_manager'] },
  { icon: UserCog,         label: 'Xodimlar',          path: '/staff',      roles: ['admin','super_admin'] },
  { icon: Activity,        label: 'Faoliyat jurnali',  path: '/activity',   roles: ['admin','super_admin'] },
  { icon: Settings,        label: 'Sozlamalar',        path: '/settings',   roles: ['admin','super_admin'] },
]

const ROLE_LABELS = {
  admin: 'Administrator',
  super_admin: 'Super Admin',
  branch_manager: 'Filial boshqaruvchisi',
  seller: 'Sotuvchi',
  operator: 'Operator',
}

function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export default function AdminSidebar() {
  const nav = useNavigate()
  const loc = useLocation()
  const [lowStockCount, setLowStockCount] = useState(0)

  const user = useMemo(() => {
    try {
      const stored = localStorage.getItem('admin_user')
      if (stored) return JSON.parse(stored)
    } catch {}
    const token = localStorage.getItem('admin_token')
    return token ? decodeToken(token) : null
  }, [])

  const role = user?.role || 'admin'

  const navItems = useMemo(() =>
    ALL_NAV.filter(item => !item.roles || item.roles.includes(role)),
  [role])

  useEffect(() => {
    api.get('/inventory/overview').then(d => {
      setLowStockCount((d?.low_stock_count || 0) + (d?.out_of_stock || 0))
    }).catch(() => {})
    const interval = setInterval(() => {
      api.get('/inventory/overview').then(d => {
        setLowStockCount((d?.low_stock_count || 0) + (d?.out_of_stock || 0))
      }).catch(() => {})
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const logout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    toast.success("Chiqildi")
    nav('/login', { replace: true })
  }

  const isActive = (path) =>
    path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(path)

  const displayName = user?.name || user?.full_name || user?.email || 'Admin'
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside className="w-56 min-h-screen bg-[#1C1C1E] flex flex-col fixed left-0 top-0 bottom-0 z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
            <Crown size={16} className="text-primary" />
          </div>
          <div>
            <div className="flex items-baseline gap-1 leading-none">
              <span className="font-serif text-primary text-sm font-bold tracking-widest">MIXART</span>
              <span className="text-[10px] text-gray-500 tracking-widest font-medium">FASHION</span>
            </div>
            <div className="text-[9px] text-gray-600 tracking-widest mt-0.5">ADMIN PANEL</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = isActive(path)
            const showBadge = path === '/inventory' && lowStockCount > 0
            return (
              <button
                key={path}
                onClick={() => nav(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative ${
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r" />
                )}
                <Icon size={16} />
                <span className="flex-1 text-left">{label}</span>
                {showBadge && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {lowStockCount > 99 ? '99+' : lowStockCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-xs font-medium text-gray-200 truncate">{displayName}</div>
            <div className="text-[10px] text-gray-500 truncate">{ROLE_LABELS[role] || role}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-all mt-1 text-red-400 hover:text-red-300"
        >
          <LogOut size={15} />
          <span className="text-xs">Chiqish</span>
        </button>
        <div className="text-center mt-2 text-[10px] text-gray-600">© 2025 Mixart Fashion</div>
      </div>
    </aside>
  )
}
