import React, { useState, useEffect, useCallback, useRef } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import ConfirmModal from '../components/ui/ConfirmModal'
import Pagination from '../components/ui/Pagination'
import {
  Plus, Search, Grid, List, MoreVertical, Pencil, Trash2, Package, X, Flame, Upload,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { productsAPI, uploadAPI, settingsAPI } from '../services/api'
import { formatPrice } from '../utils/formatters'
import useSSE from '../hooks/useSSE'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE SIZE']
const PER_PAGE = 20
const MEDIA_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')

function decodeToken(token) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}
function getCurrentRole() {
  try {
    const s = localStorage.getItem('admin_user')
    if (s) return JSON.parse(s)?.role
  } catch {}
  const t = localStorage.getItem('admin_token')
  return t ? decodeToken(t)?.role : null
}

function getImageUrl(images) {
  if (!images || !images.length) return null
  const img = images[0]
  if (!img) return null
  if (img.startsWith('http')) return img
  return `${MEDIA_BASE}${img}`
}

function ProductModal({ open, onClose, onSaved, categories, editProduct, fieldConfig = {}, currentRole }) {
  const isEdit = !!editProduct
  const isSuperAdmin = currentRole === 'super_admin'

  // Returns visibility: true=show, false=hide
  const vis = (key) => isSuperAdmin || (fieldConfig[key] !== 'hidden')
  // Returns whether field is required
  const req = (key) => fieldConfig[key] === 'required'

  const empty = {
    name_uz: '', name_ru: '', sku: '', price: '', old_price: '', category_id: '',
    is_trending: false, sizes: [], colors: '', images: '',
  }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (open) {
      if (editProduct) {
        setForm({
          name_uz: editProduct.name_uz || '',
          name_ru: editProduct.name_ru || '',
          sku: editProduct.sku || '',
          price: editProduct.price ?? '',
          old_price: editProduct.old_price ?? '',
          category_id: editProduct.category_id ?? '',
          is_trending: !!(editProduct.is_trending),
          sizes: Array.isArray(editProduct.sizes)
            ? editProduct.sizes
            : editProduct.sizes
              ? String(editProduct.sizes).split(',').map(s => s.trim()).filter(Boolean)
              : [],
          colors: Array.isArray(editProduct.colors)
            ? editProduct.colors.join(', ')
            : editProduct.colors || '',
          images: Array.isArray(editProduct.images)
            ? editProduct.images.join(', ')
            : editProduct.images || '',
        })
      } else {
        setForm(empty)
      }
    }
  }, [open, editProduct])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleSize = (sz) => {
    set('sizes', form.sizes.includes(sz)
      ? form.sizes.filter(s => s !== sz)
      : [...form.sizes, sz])
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(files.map(f => uploadAPI.productImage(f).then(r => r.url)))
      const existing = form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : []
      set('images', [...existing, ...urls].join(', '))
      toast.success(`${urls.length} ta rasm yuklandi`)
    } catch {
      toast.error('Rasm yuklanmadi')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeImage = (url) => {
    const arr = form.images.split(',').map(s => s.trim()).filter(s => s && s !== url)
    set('images', arr.join(', '))
  }

  const handleSave = async () => {
    if (!form.name_uz.trim()) return toast.error("Mahsulot nomi kiritilishi shart")
    if (!form.price) return toast.error("Narxi kiritilishi shart")
    if (req('sku') && !form.sku.trim()) return toast.error("Article / ID raqami kiritilishi shart")
    if (req('name_ru') && !form.name_ru.trim()) return toast.error("Rus tilidagi nomi kiritilishi shart")
    if (req('category_id') && !form.category_id) return toast.error("Kategoriya tanlanishi shart")
    if (req('sizes') && !form.sizes.length) return toast.error("Kamida bitta o'lcham tanlanishi shart")
    if (req('colors') && !form.colors.trim()) return toast.error("Rang kiritilishi shart")
    if (req('images') && !form.images.trim()) return toast.error("Kamida bitta rasm yuklanishi shart")
    setSaving(true)
    try {
      const imagesArr = form.images
        ? form.images.split(',').map(s => s.trim()).filter(Boolean)
        : []
      const colorsArr = form.colors
        ? form.colors.split(',').map(s => s.trim()).filter(Boolean)
        : []
      const payload = {
        name_uz: form.name_uz.trim(),
        name_ru: form.name_ru.trim(),
        sku: form.sku.trim() || null,
        price: Number(form.price),
        old_price: form.old_price ? Number(form.old_price) : null,
        category_id: form.category_id || null,
        is_trending: form.is_trending ? 1 : 0,
        sizes: form.sizes,
        colors: colorsArr,
        images: imagesArr,
      }
      if (isEdit) {
        await productsAPI.update(editProduct.id, payload)
      } else {
        await productsAPI.create(payload)
      }
      toast.success("Mahsulot saqlandi!")
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e?.message || "Xato yuz berdi")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-semibold text-gray-900">
            {isEdit ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* SKU / Article */}
          {vis('sku') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Article / ID raqami {req('sku') && <span className="text-red-400">*</span>}
              </label>
              <input
                value={form.sku}
                onChange={e => set('sku', e.target.value)}
                placeholder="MX-001, SKU-1234..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary font-mono"
              />
            </div>
          )}
          {/* Name UZ */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Nomi (UZ) <span className="text-red-400">*</span>
            </label>
            <input
              value={form.name_uz}
              onChange={e => set('name_uz', e.target.value)}
              placeholder="Mahsulot nomi (o'zbek)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          {/* Name RU */}
          {vis('name_ru') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Nomi (RU) {req('name_ru') && <span className="text-red-400">*</span>}
              </label>
              <input
                value={form.name_ru}
                onChange={e => set('name_ru', e.target.value)}
                placeholder="Название продукта (русский)"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          )}
          {/* Prices */}
          <div className={vis('old_price') ? 'grid grid-cols-2 gap-3' : ''}>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Narxi (so'm) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="299000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            {vis('old_price') && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Eski narxi {req('old_price') && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="number"
                  value={form.old_price}
                  onChange={e => set('old_price', e.target.value)}
                  placeholder="399000"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
            )}
          </div>
          {/* Category */}
          {vis('category_id') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Kategoriya {req('category_id') && <span className="text-red-400">*</span>}
              </label>
              <select
                value={form.category_id}
                onChange={e => set('category_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-white"
              >
                <option value="">— Kategoriya tanlang —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name_uz || c.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Sizes */}
          {vis('sizes') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                O'lchamlar {req('sizes') && <span className="text-red-400">*</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {SIZES.map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleSize(sz)}
                    className={`px-3 py-1 text-xs rounded-lg border font-medium transition-all ${
                      form.sizes.includes(sz)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Colors */}
          {vis('colors') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Ranglar {req('colors') ? <span className="text-red-400">*</span> : <span className="text-gray-400">(vergul bilan ajrating)</span>}
              </label>
              <input
                value={form.colors}
                onChange={e => set('colors', e.target.value)}
                placeholder="Qora, Oq, Jigarrang"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          )}
          {/* Images */}
          {vis('images') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Rasmlar {req('images') && <span className="text-red-400">*</span>}
              </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
            >
              <Upload size={15} />
              {uploading ? 'Yuklanmoqda...' : 'Rasm yuklash (bir nechta)'}
            </button>
            {form.images && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.images.split(',').map(s => s.trim()).filter(Boolean).map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                    <img
                      src={url.startsWith('http') ? url : `${MEDIA_BASE}${url}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}
          {/* Trending */}
          {vis('is_trending') && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => set('is_trending', !form.is_trending)}
                className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${form.is_trending ? 'bg-orange-400' : 'bg-gray-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.is_trending ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm text-gray-700 flex items-center gap-1.5">
                <Flame size={14} className={form.is_trending ? 'text-orange-500' : 'text-gray-300'} />
                Trend mahsulot
              </span>
            </label>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product, onEdit, onDelete, onToggleTrending }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const imgUrl = getImageUrl(product.images)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {imgUrl ? (
          <img src={imgUrl} alt={product.name_uz} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={40} className="text-gray-300" />
          </div>
        )}
        {/* Trending badge */}
        <button
          onClick={() => onToggleTrending(product)}
          className={`absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
            product.is_trending
              ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200'
              : 'bg-white/80 text-gray-400 border-gray-200 hover:bg-orange-50 hover:text-orange-500'
          }`}
        >
          <Flame size={11} />
          {product.is_trending ? 'Trend' : ''}
        </button>
      </div>
      <div className="p-4 relative">
        {/* 3-dot menu */}
        <div className="absolute top-3 right-3" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical size={14} className="text-gray-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-20 w-32">
              <button
                onClick={() => { setMenuOpen(false); onEdit(product) }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Pencil size={13} className="text-gray-400" /> Tahrirlash
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(product) }}
                className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={13} /> O'chirish
              </button>
            </div>
          )}
        </div>
        <div className="font-semibold text-gray-900 text-sm pr-8 leading-snug">{product.name_uz}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {product.cat_name && <span className="text-[11px] text-gray-400">{product.cat_name}</span>}
          {product.sku && <span className="text-[10px] font-mono text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">#{product.sku}</span>}
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-base font-bold text-primary">{formatPrice(product.price)}</span>
          {product.old_price && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.old_price)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-100" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-50 rounded w-1/2" />
        <div className="h-5 bg-gray-100 rounded w-1/3 mt-2" />
      </div>
    </div>
  )
}

export default function ProductsAdmin() {
  const [products, setProducts]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [categories, setCategories]     = useState([])
  const [search, setSearch]             = useState('')
  const [categoryId, setCategoryId]     = useState('')
  const [viewMode, setViewMode]         = useState('grid')
  const [page, setPage]                 = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [total, setTotal]               = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editProduct, setEditProduct]   = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [selected, setSelected]         = useState(new Set())
  const [confirmBulk, setConfirmBulk]   = useState(false)
  const [fieldConfig, setFieldConfig]   = useState({})
  const [sort, setSort]                 = useState('newest')
  const currentRole = getCurrentRole()

  const debounceRef = useRef(null)

  // Load categories + field config once
  useEffect(() => {
    productsAPI.categories()
      .then(res => setCategories(Array.isArray(res) ? res : res?.categories || []))
      .catch(() => {})
    settingsAPI.productFields()
      .then(fc => { if (fc && typeof fc === 'object') setFieldConfig(fc) })
      .catch(() => {})
  }, [])

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const params = { page: p, limit: PER_PAGE }
      if (search.trim()) params.search = search.trim()
      if (categoryId) params.category_id = categoryId
      if (sort !== 'newest') params.sort = sort
      const res = await productsAPI.list(params)
      setProducts(res.products || res.data || [])
      setTotal(res.total || 0)
      setTotalPages(res.total_pages || res.totalPages || 1)
    } catch {
      toast.error("Mahsulotlar yuklanmadi")
    } finally {
      setLoading(false)
    }
  }, [page, search, categoryId])

  // Debounce on search/category/sort change — reset to page 1
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      load(1)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [search, categoryId, sort])

  // Re-load when page changes (not triggered by search/category)
  useEffect(() => {
    load(page)
  }, [page])

  useSSE({ product_changed: () => load(page) })

  const handleToggleTrending = async (product) => {
    const newVal = product.is_trending ? 0 : 1
    try {
      await productsAPI.update(product.id, { is_trending: newVal })
      toast.success("Trend yangilandi!")
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_trending: newVal } : p))
    } catch {
      toast.error("Xato yuz berdi")
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await productsAPI.remove(confirmDelete.id)
      toast.success("Mahsulot o'chirildi!")
      setConfirmDelete(null)
      load(page)
    } catch {
      toast.error("O'chirishda xato")
    } finally {
      setDeleting(false)
    }
  }

  const toggleSelect = (id) => {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === products.length) setSelected(new Set())
    else setSelected(new Set(products.map(p => p.id)))
  }

  const handleBulkDelete = async () => {
    setDeleting(true)
    try {
      await productsAPI.bulkDelete(Array.from(selected))
      toast.success(`${selected.size} ta mahsulot o'chirildi`)
      setSelected(new Set())
      setConfirmBulk(false)
      load(page)
    } catch {
      toast.error("O'chirishda xato")
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (product) => {
    setEditProduct(product)
    setShowAddModal(true)
  }

  const handleModalClose = () => {
    setShowAddModal(false)
    setEditProduct(null)
  }

  return (
    <AdminLayout>
      <AdminHeader title="Mahsulotlar" />
      <div className="p-6 space-y-4 overflow-y-auto flex-1">

        {/* Header row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm text-gray-500">
            Jami <span className="font-semibold text-gray-800">{total}</span> ta mahsulot
          </h2>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button
                onClick={() => setConfirmBulk(true)}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Trash2 size={15} />
                {selected.size} ta o'chirish
              </button>
            )}
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => { setEditProduct(null); setShowAddModal(true) }}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={15} />
              Mahsulot qo'shish
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nomi yoki article raqami..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-primary bg-white"
          >
            <option value="newest">Yangi qo'shilgan</option>
            <option value="name_asc">Nomi A→Z</option>
            <option value="price_asc">Narxi ↑</option>
            <option value="price_desc">Narxi ↓</option>
            <option value="sku_asc">Article A→Z</option>
          </select>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setCategoryId('')}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                !categoryId ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-primary/40'
              }`}
            >
              Barchasi
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setCategoryId(String(c.id))}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                  categoryId === String(c.id)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-primary/40'
                }`}
              >
                {c.name_uz || c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-4 gap-4">
              {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-50 rounded w-1/4" />
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-20" />
                </div>
              ))}
            </div>
          )
        ) : products.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Package size={48} className="text-gray-200" />
            <p className="text-sm font-medium">Mahsulotlar topilmadi</p>
            <p className="text-xs text-gray-300">Qidiruv yoki filtrni o'zgartiring</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-4 gap-4">
            {products.map(p => (
              <div key={p.id} className="relative">
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggleSelect(p.id)}
                  className="absolute top-2.5 left-2.5 z-10 w-4 h-4 accent-primary cursor-pointer"
                />
                <ProductCard
                  product={p}
                  onEdit={openEdit}
                  onDelete={setConfirmDelete}
                  onToggleTrending={handleToggleTrending}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </th>
                  {['Rasm', 'Nomi', 'Narx', 'Kategoriya', 'Trend', 'Amal'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(p => {
                  const imgUrl = getImageUrl(p.images)
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 accent-primary cursor-pointer" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                          {imgUrl
                            ? <img src={imgUrl} alt={p.name_uz} className="w-full h-full object-cover" />
                            : <Package size={16} className="text-gray-300" />
                          }
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{p.name_uz}</div>
                        {p.name_ru && <div className="text-xs text-gray-400">{p.name_ru}</div>}
                        {p.sku && <div className="text-[11px] font-mono text-gray-400 mt-0.5">#{p.sku}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-primary">{formatPrice(p.price)}</div>
                        {p.old_price && (
                          <div className="text-xs text-gray-400 line-through">{formatPrice(p.old_price)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{p.cat_name || '—'}</td>
                      <td className="px-4 py-3">
                        {p.is_trending ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-full">
                            <Flame size={10} /> Trend
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 hover:bg-primary/10 rounded-lg text-gray-400 hover:text-primary transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(p)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              perPage={PER_PAGE}
              onChange={setPage}
            />
          </div>
        )}

        {/* Pagination for grid view */}
        {!loading && products.length > 0 && viewMode === 'grid' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              perPage={PER_PAGE}
              onChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <ProductModal
        open={showAddModal}
        onClose={handleModalClose}
        onSaved={() => load(page)}
        categories={categories}
        editProduct={editProduct}
        fieldConfig={fieldConfig}
        currentRole={currentRole}
      />

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Mahsulotni o'chirish"
        description={confirmDelete ? `"${confirmDelete.name_uz}" o'chirilsinmi?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleting}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmModal
        open={confirmBulk}
        title={`${selected.size} ta mahsulotni o'chirish`}
        description="Tanlangan mahsulotlar butunlay o'chiriladi. Bu amalni bekor qilib bo'lmaydi."
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulk(false)}
        loading={deleting}
      />
    </AdminLayout>
  )
}
