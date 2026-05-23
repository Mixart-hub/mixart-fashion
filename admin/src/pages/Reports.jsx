import React, { useState, useEffect } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import { formatPrice, formatDateShort } from '../utils/formatters'
import toast from 'react-hot-toast'
import {
  TrendingUp, ShoppingCart, BarChart2, CalendarCheck,
  Download, RefreshCw, Package
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import api from '../services/api'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/* ─── Default date range: last 30 days ─────────────────────────────── */
function defaultDates() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  const fmt = d => d.toISOString().slice(0, 10)
  return { from: fmt(from), to: fmt(to) }
}

/* ─── Summary card ──────────────────────────────────────────────────── */
function SummaryCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accent || 'bg-[#C9956C]/10'}`}>
        <Icon size={18} className="text-[#C9956C]" />
      </div>
      <div className="text-xl font-bold text-gray-900 leading-tight">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

/* ─── Custom bar chart tooltip ──────────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <div className="font-medium text-gray-700 mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-900">
            {p.dataKey === 'revenue' ? formatPrice(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── MAIN COMPONENT ────────────────────────────────────────────────── */
export default function Reports() {
  const dates = defaultDates()
  const [tab, setTab] = useState('sales')
  const [dateFrom, setDateFrom] = useState(dates.from)
  const [dateTo, setDateTo] = useState(dates.to)
  const [salesData, setSalesData] = useState([])
  const [summary, setSummary] = useState(null)
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchSales = async (from = dateFrom, to = dateTo) => {
    setLoading(true)
    try {
      const data = await api.get('/admin/reports/sales', { params: { from, to } })
      setSalesData(data?.daily || [])
      setSummary(data?.summary || null)
    } catch {
      toast.error("Hisobotni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const fetchTopProducts = async () => {
    setLoading(true)
    try {
      const data = await api.get('/admin/reports/top-products')
      setTopProducts(Array.isArray(data) ? data : (data?.products || []))
    } catch {
      toast.error("Top mahsulotlarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSales()
    fetchTopProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoad = () => {
    if (tab === 'sales') fetchSales(dateFrom, dateTo)
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(
        `${API_BASE}/admin/reports/export?from=${dateFrom}&to=${dateTo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hisobot-${dateFrom}-${dateTo}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV yuklab olindi')
    } catch {
      toast.error('Export xatoligi')
    } finally {
      setExporting(false)
    }
  }

  /* Best revenue day */
  const bestDay = salesData.length > 0
    ? salesData.reduce((a, b) => (b.revenue > a.revenue ? b : a), salesData[0])
    : null

  return (
    <AdminLayout>
      <AdminHeader title="Hisobotlar" />

      <div className="p-6 space-y-5 overflow-y-auto flex-1">

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-gray-100">
          {[
            { id: 'sales', label: 'Savdo hisoboti' },
            { id: 'products', label: 'Top mahsulotlar' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-[#C9956C] text-[#C9956C]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Date range + actions (sales tab only) */}
        {tab === 'sales' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Dan:</label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#C9956C]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Gacha:</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={e => setDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#C9956C]"
              />
            </div>
            <button
              onClick={handleLoad}
              disabled={loading}
              className="flex items-center gap-2 bg-[#C9956C] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#b8835a] disabled:opacity-50 transition-colors"
            >
              {loading ? <RefreshCw size={13} className="animate-spin" /> : null}
              Yuklash
            </button>
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <Download size={13} />
              {exporting ? 'Yuklanmoqda...' : 'CSV export'}
            </button>
          </div>
        )}

        {/* ─── SALES TAB ───────────────────────────────────────────────── */}
        {tab === 'sales' && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4">
              <SummaryCard
                icon={TrendingUp}
                label="Jami daromad"
                value={summary ? formatPrice(summary.total_revenue) : '—'}
                sub={`${dateFrom} — ${dateTo}`}
              />
              <SummaryCard
                icon={ShoppingCart}
                label="Buyurtmalar soni"
                value={summary ? (summary.total_orders ?? 0).toLocaleString() : '—'}
                sub="Tanlangan davr"
              />
              <SummaryCard
                icon={BarChart2}
                label="O'rtacha buyurtma"
                value={summary ? formatPrice(summary.avg_order) : '—'}
                sub="Bir buyurtma uchun"
              />
              <SummaryCard
                icon={CalendarCheck}
                label="Daromadli kun"
                value={bestDay ? formatDateShort(bestDay.date) : '—'}
                sub={bestDay ? formatPrice(bestDay.revenue) : '—'}
              />
            </div>

            {/* Bar chart */}
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Kunlik daromad</h3>
                <span className="text-xs text-gray-400">{salesData.length} kun</span>
              </div>

              {loading ? (
                <div className="h-56 flex items-center justify-center">
                  <RefreshCw size={24} className="text-gray-300 animate-spin" />
                </div>
              ) : salesData.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-gray-300">
                  <BarChart2 size={36} className="mb-2" />
                  <span className="text-sm">Ma'lumot topilmadi</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={salesData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => formatDateShort(v)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="revenue"
                      name="Daromad"
                      fill="#C9956C"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Daily table */}
            {salesData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                      {['Sana', 'Buyurtmalar', 'Daromad'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {salesData.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDateShort(row.date)}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-900">{row.orders_count ?? 0}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#C9956C]">
                          {formatPrice(row.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ─── TOP PRODUCTS TAB ────────────────────────────────────────── */}
        {tab === 'products' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Top 10 mahsulotlar</h3>
              <button
                onClick={fetchTopProducts}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#C9956C] transition-colors"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                Yangilash
              </button>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-4 bg-gray-100 rounded animate-pulse" />
                    <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
                    <div className="w-16 h-4 bg-gray-100 rounded animate-pulse" />
                    <div className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-gray-300">
                <Package size={36} className="mb-3" />
                <span className="text-sm">Ma'lumot topilmadi</span>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    {['#', 'Mahsulot', 'Sotilgan', 'Daromad'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topProducts.slice(0, 10).map((product, i) => {
                    const img = Array.isArray(product.images) ? product.images[0] : product.images
                    return (
                      <tr key={product.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Rank */}
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${
                            i === 0 ? 'text-amber-500' :
                            i === 1 ? 'text-gray-400' :
                            i === 2 ? 'text-orange-600' :
                            'text-gray-300'
                          }`}>
                            {i + 1}
                          </span>
                        </td>

                        {/* Product */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {img
                              ? <img src={img} alt={product.name_uz} className="w-8 h-8 rounded-lg object-cover border border-gray-100 shrink-0" />
                              : <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 text-gray-300"><Package size={13} /></div>
                            }
                            <span className="text-sm font-medium text-gray-900 max-w-[220px] truncate">
                              {product.name_uz || '—'}
                            </span>
                          </div>
                        </td>

                        {/* Sold qty */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#C9956C]/10 text-[#C9956C] text-xs font-semibold">
                            {(product.sold_qty ?? 0).toLocaleString()} dona
                          </span>
                        </td>

                        {/* Revenue */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-gray-900">
                            {formatPrice(product.revenue)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
