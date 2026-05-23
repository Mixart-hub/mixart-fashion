import React, { useEffect, useState } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { ShoppingBag, DollarSign, Users, Package, Eye, RefreshCw } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { dashboardAPI } from '../services/api'
import { formatPrice, formatDateShort } from '../utils/formatters'
import useSSE from '../hooks/useSSE'

const DAY_LABELS = { Mon: 'Du', Tue: 'Se', Wed: 'Ch', Thu: 'Pa', Fri: 'Ju', Sat: 'Sh', Sun: 'Ya' }

const FALLBACK_CHART = [
  { day: 'Du', revenue: 2400000 }, { day: 'Se', revenue: 3800000 },
  { day: 'Ch', revenue: 1600000 }, { day: 'Pa', revenue: 5400000 },
  { day: 'Ju', revenue: 7000000 }, { day: 'Sh', revenue: 8400000 },
  { day: 'Ya', revenue: 5600000 },
]

const CAT_COLORS = ['#C9956C', '#B87333', '#E8A87C', '#8B6F5E', '#D1B8AC', '#9CA3AF']

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [chart, setChart] = useState(FALLBACK_CHART)
  const [topCats, setTopCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7D')

  const load = async () => {
    setLoading(true)
    try {
      const s = await dashboardAPI.stats()
      setStats(s)
      setOrders(s?.recent_orders || [])

      try {
        const rev = await dashboardAPI.revenue()
        if (rev?.length) {
          const mapped = rev.slice(-7).map(r => ({
            day: new Date(r.month + '-01').toLocaleDateString('uz-UZ', { month: 'short' }),
            revenue: r.revenue || 0,
          }))
          setChart(mapped)
        }
      } catch {}

      try {
        const cats = await dashboardAPI.topCategories()
        if (Array.isArray(cats) && cats.length) setTopCats(cats)
      } catch {}
    } catch (e) {
      console.error('Dashboard load error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Real-time: yangi buyurtma kelsa → statistika va jadval yangilanadi
  useSSE({
    order_created: (data) => {
      toast.success(`Yangi buyurtma! ${data.id}`, { duration: 5000 })
      load()
    },
    order_updated: () => {
      load()
    },
  })

  const s = stats || {}

  return (
    <AdminLayout>
      <AdminHeader title="Boshqaruv paneli" showDatePicker showExport />
      <div className="p-6 space-y-6 overflow-y-auto">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
                <div className="h-10 w-10 bg-gray-100 rounded-lg mb-3" />
                <div className="h-7 w-24 bg-gray-100 rounded mb-2" />
                <div className="h-4 w-32 bg-gray-50 rounded" />
              </div>
            ))
          ) : (<>
            <StatCard icon={ShoppingBag} label="Jami buyurtmalar"   value={(s.total_orders || 0).toLocaleString('uz-UZ')} trend={12.5} trendLabel="o'tgan oyga nisbatan" color="primary" />
            <StatCard icon={DollarSign} label="Daromad (so'mda)"    value={formatPrice(s.revenue || 0)} trend={8.2}  trendLabel="o'tgan oyga nisbatan" color="green" />
            <StatCard icon={Users}      label="Mijozlar"             value={(s.total_customers || 0).toLocaleString('uz-UZ')} trend={5.1} trendLabel="bu oy yangi"         color="blue" />
            <StatCard icon={Package}    label="Mahsulotlar"          value={s.total_products || 0}             trend={-2.3} trendLabel="o'tgan oyga nisbatan" color="purple" />
          </>)}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Daromad ko'rinishi</h3>
              <div className="flex gap-2">
                {['7D', '30D', '90D'].map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${p === period ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9956C" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#C9956C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={v => [formatPrice(v), 'Daromad']} />
                <Area type="monotone" dataKey="revenue" stroke="#C9956C" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Top kategoriyalar</h3>
            <div className="space-y-3">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex justify-between mb-1">
                      <div className="h-3.5 bg-gray-100 rounded w-28" />
                      <div className="h-3.5 bg-gray-100 rounded w-8" />
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full" />
                  </div>
                ))
              ) : topCats.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Ma'lumot yo'q</p>
              ) : (
                topCats.slice(0, 6).map((c, i) => (
                  <div key={c.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate mr-2">{c.name}</span>
                      <span className="text-gray-500 font-medium shrink-0">{c.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.pct}%`, background: CAT_COLORS[i % CAT_COLORS.length] }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900">So'nggi buyurtmalar</h3>
            <div className="flex items-center gap-3">
              <button onClick={load} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <RefreshCw size={14} className="text-gray-400" />
              </button>
              <a href="/orders" className="text-sm text-primary hover:underline">Barchasini ko'rish →</a>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                  <th className="px-5 py-3 text-left">BUYURTMA ID</th>
                  <th className="px-5 py-3 text-left">MIJOZ</th>
                  <th className="px-5 py-3 text-left">SUMMA</th>
                  <th className="px-5 py-3 text-left">HOLAT</th>
                  <th className="px-5 py-3 text-left">SANA</th>
                  <th className="px-5 py-3 text-left">AMAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}>
                      {Array(6).fill(0).map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? 80 : j === 2 ? 90 : 70 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">Buyurtmalar topilmadi</td></tr>
                ) : (
                  orders.slice(0, 5).map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-mono text-primary font-semibold">
                        {o.id?.toString().startsWith('MXF') ? o.id : `MXF-${String(o.id).padStart(5, '0')}`}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{o.delivery_name || o.customer || '—'}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-primary">{formatPrice(o.final_amount || o.total_amount)}</td>
                      <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-5 py-3 text-sm text-gray-400">{formatDateShort(o.created_at)}</td>
                      <td className="px-5 py-3">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                          <Eye size={15} className="text-gray-400 hover:text-primary" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
