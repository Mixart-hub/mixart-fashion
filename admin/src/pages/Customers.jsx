import React, { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import Pagination from '../components/ui/Pagination'
import StatusBadge from '../components/ui/StatusBadge'
import { customersAPI } from '../services/api'
import { formatPrice, formatDate, formatDateShort } from '../utils/formatters'
import toast from 'react-hot-toast'
import { Search, ChevronDown, ChevronUp, Star, Download, Users, ShoppingBag } from 'lucide-react'
import api from '../services/api'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/* ─── Avatar initials ───────────────────────────────────────────────── */
function Avatar({ name }) {
  const initials = (name || '')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()

  return (
    <div className="w-9 h-9 rounded-full bg-[#C9956C]/20 text-[#C9956C] text-xs font-bold flex items-center justify-center shrink-0">
      {initials || '?'}
    </div>
  )
}

/* ─── Skeleton row ──────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      {[200, 120, 130, 100, 80, 80, 60, 40].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

/* ─── Expanded orders panel ─────────────────────────────────────────── */
function ExpandedOrders({ customerId, cache, setCache }) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cache[customerId]) return
    setLoading(true)
    api.get(`/admin/customers/${customerId}/orders`)
      .then(data => {
        const orders = Array.isArray(data) ? data : (data?.orders || [])
        setCache(prev => ({ ...prev, [customerId]: orders.slice(0, 5) }))
      })
      .catch(() => toast.error("Buyurtmalarni yuklashda xatolik"))
      .finally(() => setLoading(false))
  }, [customerId, cache, setCache])

  const orders = cache[customerId] || []

  if (loading) {
    return (
      <div className="px-6 pb-4">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="px-6 pb-4">
        <div className="text-sm text-gray-400 py-3">Buyurtmalar topilmadi</div>
      </div>
    )
  }

  return (
    <div className="px-6 pb-4">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
        So'nggi buyurtmalar
      </div>
      <div className="flex flex-wrap gap-2">
        {orders.map(order => (
          <div
            key={order.id}
            className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5"
          >
            <div>
              <div className="text-xs font-semibold text-gray-700">#{order.id}</div>
              <div className="text-xs text-gray-400">{formatDateShort(order.created_at)}</div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <div className="text-xs font-semibold text-[#C9956C]">{formatPrice(order.total_amount || order.total)}</div>
            </div>
            <StatusBadge status={order.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── MAIN COMPONENT ────────────────────────────────────────────────── */
export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [expanded, setExpanded] = useState(null)
  const [expandedOrders, setExpandedOrders] = useState({})

  const LIMIT = 20

  const fetchCustomers = useCallback(async (q = search, p = page) => {
    setLoading(true)
    try {
      const data = await customersAPI.list({ search: q, page: p, limit: LIMIT })
      const list = Array.isArray(data) ? data : (data?.customers || [])
      const tot = data?.total ?? list.length
      setCustomers(list)
      setTotal(tot)
      setTotalPages(data?.totalPages ?? Math.ceil(tot / LIMIT))
    } catch {
      toast.error("Mijozlarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }, [search, page])

  /* Debounce search */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    fetchCustomers(search, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page])

  const toggleExpand = (id) => {
    setExpanded(prev => prev === id ? null : id)
  }

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`${API_BASE}/admin/customers/export?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `customers-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV yuklab olindi')
    } catch {
      toast.error('Export xatoligi')
    }
  }

  return (
    <AdminLayout>
      <AdminHeader title="Mijozlar" />

      <div className="p-6 space-y-5 overflow-y-auto flex-1">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Ism, telefon yoki email..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9956C] transition-colors"
            />
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            CSV export
          </button>
        </div>

        {/* Stats summary */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users size={15} className="text-[#C9956C]" />
            <span>Jami: <span className="font-semibold text-gray-900">{total.toLocaleString()}</span> mijoz</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                {['Mijoz', 'Telefon', 'Email', 'Buyurtmalar', 'Jami xarid', 'Loyalty', 'Oxirgi buyurtma', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : customers.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <Users size={36} className="text-gray-200 mx-auto mb-3" />
                        <div className="text-sm text-gray-400">Mijoz topilmadi</div>
                      </td>
                    </tr>
                  )
                  : customers.map(customer => {
                    const isExpanded = expanded === customer.id
                    return (
                      <React.Fragment key={customer.id}>
                        <tr className={`hover:bg-gray-50/60 transition-colors border-b border-gray-50 ${isExpanded ? 'bg-[#C9956C]/5' : ''}`}>
                          {/* Avatar + name */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={customer.full_name} />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{customer.full_name || '—'}</div>
                                <div className="text-xs text-gray-400">#{customer.id}</div>
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {customer.phone || '—'}
                          </td>

                          {/* Email */}
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-[180px] truncate">
                            {customer.email || '—'}
                          </td>

                          {/* Orders count */}
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                              <ShoppingBag size={10} />
                              {customer.total_orders ?? 0}
                            </span>
                          </td>

                          {/* Total spent */}
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold text-[#C9956C]">
                              {formatPrice(customer.total_spent)}
                            </span>
                          </td>

                          {/* Loyalty points */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Star size={13} className="text-amber-400 fill-amber-400" />
                              {(customer.loyalty_points ?? 0).toLocaleString()}
                            </div>
                          </td>

                          {/* Last order */}
                          <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                            {customer.last_order_date ? formatDateShort(customer.last_order_date) : '—'}
                          </td>

                          {/* Expand */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleExpand(customer.id)}
                              className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-[#C9956C]/10 text-[#C9956C]' : 'hover:bg-gray-100 text-gray-400'}`}
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded orders row */}
                        {isExpanded && (
                          <tr className="bg-[#C9956C]/5 border-b border-gray-100">
                            <td colSpan={8}>
                              <ExpandedOrders
                                customerId={customer.id}
                                cache={expandedOrders}
                                setCache={setExpandedOrders}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
              }
            </tbody>
          </table>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            perPage={LIMIT}
            onChange={p => setPage(p)}
          />
        </div>
      </div>
    </AdminLayout>
  )
}
