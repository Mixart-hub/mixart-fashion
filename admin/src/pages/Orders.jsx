import React, { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import StatusBadge from '../components/ui/StatusBadge'
import { Search, ChevronDown, ChevronUp, X, Package, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { ordersAPI } from '../services/api'
import { formatPrice, formatDateShort } from '../utils/formatters'
import useSSE from '../hooks/useSSE'

const STATUSES = ['Barchasi', 'Yangi', 'Jarayonda', 'Yuborildi', 'Yetkazildi', 'Bekor']
const STATUS_MAP = { 'Barchasi': 'All', 'Yangi': 'new', 'Jarayonda': 'processing', 'Yuborildi': 'shipped', 'Yetkazildi': 'delivered', 'Bekor': 'cancelled' }
const PAY_STATUSES = ['Barchasi', "To'langan", "To'lanmagan"]
const PAY_MAP = { 'Barchasi': 'All', "To'langan": 'paid', "To'lanmagan": 'unpaid' }

const NEW_STATUS_OPTIONS = [
  { value: 'new',        label: 'Yangi' },
  { value: 'processing', label: 'Jarayonda' },
  { value: 'shipped',    label: 'Yuborildi' },
  { value: 'delivered',  label: 'Yetkazildi' },
  { value: 'cancelled',  label: 'Bekor qilindi' },
]

export default function OrdersAdmin() {
  const [statusFilter, setStatusFilter]   = useState('Barchasi')
  const [payFilter, setPayFilter]         = useState('Barchasi')
  const [search, setSearch]               = useState('')
  const [expanded, setExpanded]           = useState(null)
  const [page, setPage]                   = useState(1)
  const [orders, setOrders]               = useState([])
  const [total, setTotal]                 = useState(0)
  const [totalPages, setTotalPages]       = useState(1)
  const [loading, setLoading]             = useState(true)
  const [updating, setUpdating]           = useState(null)
  const PER_PAGE = 10

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: PER_PAGE }
      const sv = STATUS_MAP[statusFilter]
      if (sv !== 'All') params.status = sv
      const pv = PAY_MAP[payFilter]
      if (pv !== 'All') params.payment_status = pv
      if (search.trim()) params.search = search.trim()
      const res = await ordersAPI.list(params)
      setOrders(res.orders || [])
      setTotal(res.total || 0)
      setTotalPages(res.total_pages || 1)
    } catch {
      toast.error("Buyurtmalar yuklanmadi")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, payFilter, search])

  useEffect(() => { load() }, [load])

  // Real-time: yangi buyurtma → ro'yxatga qo'shiladi, status o'zgarsa → yangilanadi
  useSSE({
    order_created: (data) => {
      toast.success(`Yangi buyurtma! ${data.id}`, { duration: 5000 })
      setPage(1)
      load()
    },
    order_updated: (data) => {
      // Ro'yxatdagi buyurtmani refresh qilmasdan yangilaymiz
      setOrders(prev => prev.map(o =>
        String(o.id) === String(data.id)
          ? { ...o, ...(data.status && { status: data.status }), ...(data.payment_status && { payment_status: data.payment_status }) }
          : o
      ))
    },
  })

  const handleExport = () => {
    if (orders.length === 0) { toast.error('Eksport qilish uchun buyurtmalar yo\'q'); return }
    const header = 'Buyurtma ID,Mijoz,Telefon,Holat,Summa,To\'lov usuli,Sana\n'
    const rows = orders.map(o =>
      [
        `MXF-${String(o.id).padStart(5,'0')}`,
        (o.delivery_name || o.full_name || '').replace(/,/g, ' '),
        o.delivery_phone || o.user_phone || '',
        o.status,
        o.final_amount || o.total_amount || 0,
        o.payment_method || '',
        o.created_at?.slice(0, 10) || '',
      ].join(',')
    ).join('\n')
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV yuklab olindi!')
  }

  const updateStatus = async (orderId, newStatus) => {
    setUpdating(orderId)
    try {
      await ordersAPI.update(orderId, { status: newStatus })
      toast.success("Status yangilandi")
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    } catch {
      toast.error("Xato yuz berdi")
    } finally {
      setUpdating(null)
    }
  }

  return (
    <AdminLayout>
      <AdminHeader title="Buyurtmalar" showDatePicker showExport onExport={handleExport} />
      <div className="p-6 space-y-4 overflow-y-auto flex-1">

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-wrap gap-3 items-center">
          <Select label="Holat" value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }} options={STATUSES} />
          <Select label="To'lov" value={payFilter}    onChange={v => { setPayFilter(v);    setPage(1) }} options={PAY_STATUSES} />
          <div className="flex-1 min-w-48 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="ID, mijoz nomi yoki telefon..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <button onClick={load} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw size={15} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-400">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-primary" />
              Yuklanmoqda...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">Buyurtmalar topilmadi</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  {['Buyurtma ID', 'Mijoz', 'Telefon', 'Holat', "Summa", "To'lov", 'Sana', 'Amal'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <React.Fragment key={o.id}>
                    <tr
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-primary font-semibold">
                        MXF-{String(o.id).padStart(5, '0')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{o.delivery_name || o.full_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{o.delivery_phone || o.user_phone || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-sm font-semibold text-primary">{formatPrice(o.final_amount || o.total_amount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <StatusBadge status={o.payment_status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{formatDateShort(o.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {expanded === o.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </td>
                    </tr>

                    {expanded === o.id && (
                      <tr>
                        <td colSpan={8} className="bg-primary/5 px-6 py-4">
                          <div className="flex gap-6 relative">
                            <button onClick={() => setExpanded(null)}
                              className="absolute top-0 right-0 p-1 hover:bg-gray-200 rounded-lg">
                              <X size={14} className="text-gray-500" />
                            </button>

                            {/* Items */}
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Mahsulotlar</div>
                              {(o.items || []).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                                    <Package size={14} className="text-gray-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-800 truncate">{item.product_name || item.name}</div>
                                    <div className="text-xs text-gray-400">
                                      {item.size && `O'lcham: ${item.size}`} {item.color && `· Rang: ${item.color}`} · Soni: {item.quantity || item.qty}
                                    </div>
                                  </div>
                                  <div className="text-sm font-semibold text-primary shrink-0">{formatPrice(item.subtotal || item.price)}</div>
                                </div>
                              ))}
                            </div>

                            {/* Shipping */}
                            <div className="w-52">
                              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Yetkazish</div>
                              <div className="text-sm text-gray-700 mb-1">📍 {o.delivery_address || '—'}</div>
                              {(o.delivery_name || o.delivery_phone) && (
                                <div className="text-sm text-gray-600 mb-1">
                                  👤 {[o.delivery_name, o.delivery_phone].filter(Boolean).join(' · ')}
                                </div>
                              )}
                              {o.estimated_delivery && (
                                <div className="text-xs text-blue-600 mb-1">🕐 {o.estimated_delivery}</div>
                              )}
                              {o.note && <div className="text-xs text-amber-600 mt-2 bg-amber-50 px-2 py-1 rounded-lg">📝 {o.note}</div>}
                            </div>

                            {/* Status update */}
                            <div className="w-44">
                              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Status o'zgartir</div>
                              <div className="text-lg font-bold text-primary mb-2">{formatPrice(o.final_amount)}</div>
                              <select
                                value={o.status}
                                disabled={updating === o.id}
                                onChange={e => updateStatus(o.id, e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary bg-white disabled:opacity-50"
                              >
                                {NEW_STATUS_OPTIONS.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {!loading && orders.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                Jami {total} ta buyurtma
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  Oldingi
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`px-3 py-1.5 text-sm border rounded-lg ${page === n ? 'bg-primary text-white border-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  Keyingi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary cursor-pointer"
      >
        {options.map(o => (
          <option key={o} value={o}>{o === options[0] ? `${label}: Barchasi` : o}</option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}
