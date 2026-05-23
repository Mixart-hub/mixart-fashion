import React, { useState, useEffect } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import ConfirmModal from '../components/ui/ConfirmModal'
import { Plus, Pencil, Trash2, X, Tag, Copy, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { discountsAPI } from '../services/api'

function PromoModal({ open, onClose, onSaved, editItem }) {
  const isEdit = !!editItem
  const empty = { code: '', discount_percent: '', description: '', max_uses: '', expires_at: '', is_active: 1 }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(editItem ? { ...empty, ...editItem, expires_at: editItem.expires_at?.slice(0, 10) || '' } : empty)
  }, [open, editItem])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.code.trim()) return toast.error('Kod kerak')
    if (!form.discount_percent) return toast.error('Chegirma foizi kerak')
    setSaving(true)
    try {
      const payload = { ...form, discount_percent: Number(form.discount_percent), max_uses: form.max_uses ? Number(form.max_uses) : 0 }
      if (isEdit) await discountsAPI.update(editItem.id, payload)
      else await discountsAPI.create(payload)
      toast.success('Saqlandi!')
      onSaved()
      onClose()
    } catch (e) { toast.error(e?.detail || 'Xato') }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Promo kod tahrirlash' : 'Yangi promo kod'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Kod *</label>
            <input
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="WELCOME10"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary font-mono tracking-widest"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Chegirma (%) *</label>
              <input
                type="number" min="1" max="100"
                value={form.discount_percent}
                onChange={e => set('discount_percent', e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Max foydalanish</label>
              <input
                type="number" min="0"
                value={form.max_uses}
                onChange={e => set('max_uses', e.target.value)}
                placeholder="0 = cheksiz"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Tavsif</label>
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Yangi mijozlar uchun"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Amal qilish sanasi</label>
            <input
              type="date"
              value={form.expires_at}
              onChange={e => set('expires_at', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => set('is_active', form.is_active ? 0 : 1)}
              className="text-primary"
            >
              {form.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-gray-400" />}
            </button>
            <span className="text-sm text-gray-700">Faol</span>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Bekor qilish</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Discounts() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setList(await discountsAPI.list()) }
    catch { toast.error('Yuklanmadi') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleToggleActive = async (item) => {
    try {
      await discountsAPI.update(item.id, { is_active: item.is_active ? 0 : 1 })
      setList(prev => prev.map(d => d.id === item.id ? { ...d, is_active: d.is_active ? 0 : 1 } : d))
    } catch { toast.error('Xato') }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await discountsAPI.remove(confirmDelete.id)
      toast.success("O'chirildi")
      setConfirmDelete(null)
      load()
    } catch { toast.error('Xato') }
    finally { setDeleting(false) }
  }

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code)
    toast.success('Nusxalandi!')
  }

  const isExpired = (exp) => exp && new Date(exp) < new Date()

  return (
    <AdminLayout>
      <AdminHeader title="Chegirmalar" />
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">Jami <span className="font-semibold text-gray-800">{list.length}</span> ta promo kod</p>
          <button
            onClick={() => { setEditItem(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus size={15} /> Kod qo'shish
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse flex gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/4" />
                  <div className="h-3 bg-gray-50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 py-20 flex flex-col items-center gap-3 text-gray-400">
            <Tag size={48} className="text-gray-200" />
            <p className="text-sm">Promo kodlar yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(item => {
              const expired = isExpired(item.expires_at)
              return (
                <div key={item.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 ${expired ? 'border-red-100 opacity-70' : 'border-gray-100'}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.is_active && !expired ? 'bg-primary/10' : 'bg-gray-100'}`}>
                    <Tag size={18} className={item.is_active && !expired ? 'text-primary' : 'text-gray-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-gray-900 text-sm tracking-widest">{item.code}</span>
                      <button onClick={() => copyCode(item.code)} className="p-0.5 hover:text-primary text-gray-400">
                        <Copy size={12} />
                      </button>
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        -{item.discount_percent}%
                      </span>
                      {expired && <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Muddati o'tgan</span>}
                      {!item.is_active && !expired && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Nofaol</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      {item.description && <span>{item.description}</span>}
                      {item.max_uses > 0 && <span>{item.used_count || 0}/{item.max_uses} marta ishlatilgan</span>}
                      {item.max_uses === 0 && <span>{item.used_count || 0} marta ishlatilgan</span>}
                      {item.expires_at && <span>Tugaydi: {item.expires_at.slice(0, 10)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleToggleActive(item)} className="text-gray-400 hover:text-primary transition-colors">
                      {item.is_active ? <ToggleRight size={22} className="text-primary" /> : <ToggleLeft size={22} />}
                    </button>
                    <button onClick={() => { setEditItem(item); setShowModal(true) }} className="p-1.5 hover:bg-primary/10 rounded-lg text-gray-400 hover:text-primary">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setConfirmDelete(item)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <PromoModal open={showModal} onClose={() => setShowModal(false)} onSaved={load} editItem={editItem} />

      <ConfirmModal
        open={!!confirmDelete}
        title="Promo kodni o'chirish"
        description={confirmDelete ? `"${confirmDelete.code}" o'chirilsinmi?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleting}
      />
    </AdminLayout>
  )
}
