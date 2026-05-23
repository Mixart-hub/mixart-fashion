import React, { useState, useEffect, useRef, useCallback } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import StatusBadge from '../components/ui/StatusBadge'
import { inventoryAPI, productsAPI, settingsAPI } from '../services/api'
import { formatPrice } from '../utils/formatters'
import toast from 'react-hot-toast'
import {
  Plus, ArrowRightLeft, AlertTriangle, Package,
  MapPin, X, Check, Search, ChevronDown, Minus, RefreshCw,
  TrendingDown, Eye, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE SIZE']
const BRANCH_ROLES = ['branch_manager', 'seller', 'operator']

function decodeToken(token) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

function getCurrentUser() {
  try {
    const stored = localStorage.getItem('admin_user')
    if (stored) return JSON.parse(stored)
    const token = localStorage.getItem('admin_token')
    return token ? decodeToken(token) : null
  } catch { return null }
}

const getStatus = (quantity, minStock) => {
  if (quantity === 0) return 'out'
  if (quantity < (minStock || 5)) return 'low'
  return 'in_stock'
}

const STATUS_LABELS = { out: 'Tugagan', low: 'Kam zaxira', in_stock: 'Yetarli' }
const ROW_BG = { out: 'bg-red-50/40', low: 'bg-orange-50/30', in_stock: '' }

/* ─── Skeleton ──────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: i === 0 ? 160 : 60 }} />
        </td>
      ))}
    </tr>
  )
}

/* ─── Inline min-stock editor ────────────────────────────────────────── */
function MinStockCell({ item, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(item.min_stock ?? 0))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  const save = async () => {
    const numVal = parseInt(val, 10)
    if (isNaN(numVal) || numVal < 0) { setEditing(false); return }
    setSaving(true)
    try {
      await inventoryAPI.update(item.id, { min_stock: numVal })
      onSaved(item.id, numVal)
    } catch { toast.error('Xatolik') }
    finally { setSaving(false); setEditing(false) }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number" min={0} value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        onBlur={save}
        disabled={saving}
        className="w-16 border border-primary rounded px-1.5 py-0.5 text-sm focus:outline-none"
      />
    )
  }
  return (
    <button onClick={() => setEditing(true)} className="text-sm text-gray-400 hover:text-primary hover:underline transition-colors" title="Tahrirlash">
      {item.min_stock ?? 0}
    </button>
  )
}

/* ─── Inline qty +/- ─────────────────────────────────────────────────── */
function QtyCell({ item, onUpdated }) {
  const [loading, setLoading] = useState(false)

  const adjust = async (delta) => {
    setLoading(true)
    try {
      const res = await inventoryAPI.update(item.id, { delta })
      onUpdated(item.id, res.quantity ?? Math.max(0, item.quantity + delta))
      toast.success(delta > 0 ? `+${delta} qo'shildi` : `${delta} ayirildi`, { duration: 1500 })
    } catch { toast.error('Xatolik') }
    finally { setLoading(false) }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => adjust(-1)}
        disabled={loading || item.quantity <= 0}
        className="w-6 h-6 rounded-md bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors disabled:opacity-30"
      >
        <Minus size={11} />
      </button>
      <span className={`text-sm font-bold w-8 text-center ${item.quantity === 0 ? 'text-red-500' : item.quantity < (item.min_stock || 5) ? 'text-orange-500' : 'text-gray-900'}`}>
        {item.quantity ?? 0}
      </span>
      <button
        onClick={() => adjust(+1)}
        disabled={loading}
        className="w-6 h-6 rounded-md bg-gray-100 hover:bg-green-50 hover:text-green-600 flex items-center justify-center transition-colors disabled:opacity-30"
      >
        <Plus size={11} />
      </button>
    </div>
  )
}

/* ─── ADD STOCK MODAL ───────────────────────────────────────────────── */
function AddStockModal({ open, onClose, products, branches, onSuccess, defaultBranchId }) {
  const [form, setForm] = useState({ product_id: '', branch_id: defaultBranchId || '', size: '', color: '', quantity: '' })
  const [productSearch, setProductSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [showProductDrop, setShowProductDrop] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    if (!open) { setForm({ product_id: '', branch_id: defaultBranchId || '', size: '', color: '', quantity: '' }); setProductSearch('') }
  }, [open, defaultBranchId])

  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowProductDrop(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredProducts = products.filter(p =>
    (p.name_uz || '').toLowerCase().includes(productSearch.toLowerCase())
  )
  const selectedProduct = products.find(p => String(p.id) === String(form.product_id))
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.product_id || !form.branch_id || !form.size || !form.color || !form.quantity) {
      return toast.error("Barcha maydonlarni to'ldiring")
    }
    setSaving(true)
    try {
      await inventoryAPI.add({
        product_id: form.product_id,
        branch_id: Number(form.branch_id),
        size: form.size, color: form.color,
        quantity: Number(form.quantity),
      })
      toast.success("Zaxira qo'shildi!")
      onSuccess(); onClose()
    } catch (err) { toast.error(err?.detail || 'Xatolik') }
    finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-400" /></button>
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Zaxira qo'shish</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mahsulot</label>
            <div className="relative" ref={dropRef}>
              <button type="button" onClick={() => setShowProductDrop(v => !v)}
                className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm text-left">
                <span className={selectedProduct ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedProduct ? selectedProduct.name_uz : 'Mahsulot tanlang'}
                </span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
              {showProductDrop && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <input autoFocus value={productSearch} onChange={e => setProductSearch(e.target.value)}
                      placeholder="Qidirish..." className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredProducts.length === 0
                      ? <div className="px-4 py-3 text-sm text-gray-400">Topilmadi</div>
                      : filteredProducts.map(p => (
                        <button key={p.id} type="button" onClick={() => { set('product_id', String(p.id)); setShowProductDrop(false) }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${String(form.product_id) === String(p.id) ? 'text-primary font-medium' : 'text-gray-700'}`}>
                          {p.name_uz}
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Branch (hidden for branch staff — auto-set) */}
          {!defaultBranchId && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Filial</label>
              <select value={form.branch_id} onChange={e => set('branch_id', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                <option value="">Filialni tanlang</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          {/* Size chips */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">O'lcham</label>
            <div className="flex flex-wrap gap-2">
              {SIZES.map(s => (
                <button key={s} type="button" onClick={() => set('size', s)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${form.size === s ? 'bg-[#C9956C] text-white border-[#C9956C]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#C9956C]/60'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Rang</label>
            <input type="text" value={form.color} onChange={e => set('color', e.target.value)}
              placeholder="Masalan: Qora, Oq, Beige..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Miqdor</label>
            <input type="number" min={1} value={form.quantity} onChange={e => set('quantity', e.target.value)}
              placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Bekor qilish</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#C9956C] text-white rounded-xl text-sm font-medium hover:bg-[#b8835a] disabled:opacity-50">
              {saving ? 'Saqlanmoqda...' : "Qo'shish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── TRANSFER MODAL (admin only) ───────────────────────────────────── */
function TransferModal({ open, onClose, products, branches, onSuccess }) {
  const [form, setForm] = useState({ product_id: '', from_branch: '', to_branch: '', size: '', color: '', quantity: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!open) setForm({ product_id: '', from_branch: '', to_branch: '', size: '', color: '', quantity: '' }) }, [open])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.product_id || !form.from_branch || !form.to_branch || !form.size || !form.color || !form.quantity)
      return toast.error("Barcha maydonlarni to'ldiring")
    if (form.from_branch === form.to_branch) return toast.error("Manba va maqsad filiallari farq qilishi kerak")
    setSaving(true)
    try {
      await inventoryAPI.transfer({ product_id: form.product_id, from_branch: Number(form.from_branch), to_branch: Number(form.to_branch), size: form.size, color: form.color, quantity: Number(form.quantity) })
      toast.success("O'tkazildi!")
      onSuccess(); onClose()
    } catch (err) { toast.error(err?.detail || 'Xatolik') }
    finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-400" /></button>
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Zaxira o'tkazish (Filiallar arasi)</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Qayerdan</label>
              <select value={form.from_branch} onChange={e => set('from_branch', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                <option value="">Filial</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Qayerga</label>
              <select value={form.to_branch} onChange={e => set('to_branch', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                <option value="">Filial</option>
                {branches.filter(b => String(b.id) !== String(form.from_branch)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mahsulot</label>
            <select value={form.product_id} onChange={e => set('product_id', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
              <option value="">Mahsulot tanlang</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name_uz}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">O'lcham</label>
            <div className="flex flex-wrap gap-2">
              {SIZES.map(s => (
                <button key={s} type="button" onClick={() => set('size', s)} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${form.size === s ? 'bg-[#C9956C] text-white border-[#C9956C]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#C9956C]/60'}`}>{s}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Rang</label>
              <input type="text" value={form.color} onChange={e => set('color', e.target.value)} placeholder="Qora, Oq..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Miqdor</label>
              <input type="number" min={1} value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Bekor qilish</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#C9956C] text-white rounded-xl text-sm font-medium hover:bg-[#b8835a] disabled:opacity-50">
              {saving ? "O'tkazilmoqda..." : "O'tkazish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── MAIN COMPONENT ────────────────────────────────────────────────── */
export default function Inventory() {
  const currentUser = getCurrentUser()
  const isStaff = BRANCH_ROLES.includes(currentUser?.role)
  const myBranchId = currentUser?.branch_id || null

  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState([])
  const [products, setProducts] = useState([])
  const [branchId, setBranchId] = useState(isStaff ? myBranchId : null)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState('name_asc')
  const searchTimer = useRef()

  const fetchInventory = useCallback(async (bid, q, s) => {
    setLoading(true)
    try {
      const params = {}
      if (bid) params.branch_id = bid
      if (q)   params.search = q
      if (s && s !== 'name_asc') params.sort = s
      const data = await inventoryAPI.list(params)
      setInventory(Array.isArray(data) ? data : (data?.items || []))
    } catch { toast.error('Zaxirani yuklashda xatolik') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const [branchData, productData] = await Promise.all([
          settingsAPI.branches(),
          productsAPI.list({ limit: 200 }),
        ])
        setBranches(Array.isArray(branchData) ? branchData : [])
        setProducts(Array.isArray(productData) ? productData : (productData?.products || []))
      } catch { toast.error("Ma'lumotlarni yuklashda xatolik") }
    }
    init()
  }, [])

  useEffect(() => { fetchInventory(branchId, search, sort) }, [branchId, sort, fetchInventory])

  function handleSearch(q) {
    setSearch(q)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchInventory(branchId, q, sort), 400)
  }

  function toggleSort(key) {
    const next = sort === key + '_asc' ? key + '_desc' : key + '_asc'
    setSort(next)
  }

  function SortIcon({ col }) {
    if (sort === col + '_asc')  return <ArrowUp size={11} className="text-primary ml-1 shrink-0" />
    if (sort === col + '_desc') return <ArrowDown size={11} className="text-primary ml-1 shrink-0" />
    return <ArrowUpDown size={11} className="text-gray-300 ml-1 shrink-0" />
  }

  const handleQtyUpdated = (id, newQty) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, quantity: newQty } : item))
  }
  const handleMinStockSaved = (id, newVal) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, min_stock: newVal } : item))
  }

  const filtered = inventory.filter(item => {
    if (statusFilter === 'all') return true
    return getStatus(item.quantity, item.min_stock) === statusFilter
  })

  const totalItems = inventory.reduce((a, i) => a + (i.quantity ?? 0), 0)
  const lowCount   = inventory.filter(i => getStatus(i.quantity, i.min_stock) === 'low').length
  const outCount   = inventory.filter(i => getStatus(i.quantity, i.min_stock) === 'out').length

  const myBranch = branches.find(b => String(b.id) === String(myBranchId))

  return (
    <AdminLayout>
      <AdminHeader title={isStaff ? `Ombor — ${myBranch?.name || 'Filialim'}` : 'Zaxira boshqaruvi'} />

      <div className="p-6 space-y-5 overflow-y-auto flex-1">

        {/* Top actions */}
        <div className="flex items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Nomi yoki article raqami..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={() => fetchInventory(branchId, search, sort)}
              className="flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              title="Yangilash">
              <RefreshCw size={14} />
            </button>
            {!isStaff && (
              <button onClick={() => setShowTransferModal(true)}
                className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <ArrowRightLeft size={14} /> O'tkazish
              </button>
            )}
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-[#C9956C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#b8835a]">
              <Plus size={14} /> Zaxira qo'shish
            </button>
          </div>
        </div>

        {/* Staff branch info banner */}
        {isStaff && myBranch && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <MapPin size={16} className="text-indigo-500 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-indigo-700">{myBranch.name} filialing ombori</div>
              <div className="text-xs text-indigo-400">Faqat o'z filialingiz zaxirasini ko'ra va tahrirlaysiz</div>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-[#C9956C]/10 rounded-xl flex items-center justify-center shrink-0">
              <Package size={18} className="text-[#C9956C]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalItems.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-0.5">Jami mahsulotlar</div>
            </div>
          </div>
          <div
            onClick={() => setStatusFilter(f => f === 'low' ? 'all' : 'low')}
            className={`bg-white rounded-xl p-4 border shadow-sm flex items-center gap-4 cursor-pointer transition-all ${statusFilter === 'low' ? 'border-orange-300 ring-2 ring-orange-200' : 'border-orange-100'}`}>
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-500">{lowCount}</div>
              <div className="text-xs text-gray-400 mt-0.5">Kam zaxira</div>
            </div>
          </div>
          <div
            onClick={() => setStatusFilter(f => f === 'out' ? 'all' : 'out')}
            className={`bg-white rounded-xl p-4 border shadow-sm flex items-center gap-4 cursor-pointer transition-all ${statusFilter === 'out' ? 'border-red-300 ring-2 ring-red-200' : 'border-red-100'}`}>
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
              <X size={18} className="text-red-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{outCount}</div>
              <div className="text-xs text-gray-400 mt-0.5">Tugagan</div>
            </div>
          </div>
        </div>

        {/* Branch tabs (admin only) */}
        {!isStaff && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setBranchId(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${branchId === null ? 'bg-[#C9956C] text-white border-[#C9956C]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              Barchasi
            </button>
            {branches.map(b => (
              <button key={b.id} onClick={() => setBranchId(b.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${branchId === b.id ? 'bg-[#C9956C] text-white border-[#C9956C]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                <MapPin size={12} /> {b.name}
              </button>
            ))}
          </div>
        )}

        {/* Status filter chips */}
        {statusFilter !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Filtr:</span>
            <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium ${statusFilter === 'out' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
              {STATUS_LABELS[statusFilter]}
              <button onClick={() => setStatusFilter('all')} className="hover:opacity-70"><X size={11} /></button>
            </span>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleSort('name')} className="flex items-center hover:text-gray-600 transition-colors">
                      Mahsulot <SortIcon col="name" />
                    </button>
                    <button onClick={() => toggleSort('sku')} className="flex items-center hover:text-gray-600 transition-colors">
                      Article <SortIcon col="sku" />
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">O'lcham</th>
                <th className="px-4 py-3 text-left font-medium">Rang</th>
                <th className="px-4 py-3 text-left font-medium">
                  <button onClick={() => toggleSort('qty')} className="flex items-center hover:text-gray-600 transition-colors">
                    Miqdor <SortIcon col="qty" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium">Min zaxira</th>
                {!isStaff && <th className="px-4 py-3 text-left font-medium">Filial</th>}
                <th className="px-4 py-3 text-left font-medium">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={isStaff ? 6 : 7} className="px-4 py-16 text-center">
                        <Package size={36} className="text-gray-200 mx-auto mb-3" />
                        <div className="text-sm text-gray-400">
                          {search ? 'Qidiruv bo\'yicha topilmadi' : 'Zaxira topilmadi'}
                        </div>
                      </td>
                    </tr>
                  )
                  : filtered.map(item => {
                    const status = getStatus(item.quantity, item.min_stock)
                    const img = Array.isArray(item.images) ? item.images[0] : null

                    return (
                      <tr key={item.id} className={`hover:bg-gray-50/60 transition-colors ${ROW_BG[status]}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {img
                              ? <img src={img} alt={item.name_uz} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                              : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><Package size={16} className="text-gray-300" /></div>
                            }
                            <div>
                              <div className="text-sm font-medium text-gray-900 max-w-[160px] truncate">{item.name_uz || '—'}</div>
                              {item.sku && <div className="text-[11px] font-mono text-gray-400 mt-0.5">#{item.sku}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{item.size || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500">{item.color || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <QtyCell item={item} onUpdated={handleQtyUpdated} />
                        </td>
                        <td className="px-4 py-3">
                          <MinStockCell item={item} onSaved={handleMinStockSaved} />
                        </td>
                        {!isStaff && (
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-500">{item.branch_name || '—'}</span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <StatusBadge status={status} label={STATUS_LABELS[status]} />
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </div>

      <AddStockModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        products={products}
        branches={branches}
        defaultBranchId={isStaff ? myBranchId : null}
        onSuccess={() => fetchInventory(branchId, search, sort)}
      />

      {!isStaff && (
        <TransferModal
          open={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          products={products}
          branches={branches}
          onSuccess={() => fetchInventory(branchId, search, sort)}
        />
      )}
    </AdminLayout>
  )
}
