import React, { useState, useEffect, useRef } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import ConfirmModal from '../components/ui/ConfirmModal'
import { Plus, Pencil, Trash2, X, Grid3x3, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { categoriesAPI, uploadAPI } from '../services/api'

const MEDIA_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')

function CategoryModal({ open, onClose, onSaved, editItem }) {
  const isEdit = !!editItem
  const empty = { name_uz: '', name_ru: '', name_en: '', emoji: '', icon: '', image: '' }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (open) setForm(editItem ? { ...empty, ...editItem } : empty)
  }, [open, editItem])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const r = await uploadAPI.productImage(file)
      set('image', r.url)
      toast.success('Rasm yuklandi')
    } catch { toast.error('Rasm yuklanmadi') }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleSave = async () => {
    if (!form.name_uz.trim()) return toast.error('Nomi kerak')
    setSaving(true)
    try {
      if (isEdit) await categoriesAPI.update(editItem.id, form)
      else await categoriesAPI.create(form)
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
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Image */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Rasm</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {form.image ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                <img src={form.image.startsWith('http') ? form.image : `${MEDIA_BASE}${form.image}`} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => set('image', '')}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center"
                ><X size={14} className="text-white" /></button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 py-2 px-4 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
              >
                <Upload size={15} />{uploading ? 'Yuklanmoqda...' : 'Rasm yuklash'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nomi (UZ) *</label>
              <input value={form.name_uz} onChange={e => set('name_uz', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" placeholder="Kiyimlar" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nomi (RU)</label>
              <input value={form.name_ru} onChange={e => set('name_ru', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" placeholder="Одежда" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Emoji</label>
              <input value={form.emoji} onChange={e => set('emoji', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary text-center" placeholder="👗" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Icon class</label>
              <input value={form.icon} onChange={e => set('icon', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" placeholder="shirt" />
            </div>
          </div>
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

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setCategories(await categoriesAPI.list()) }
    catch { toast.error('Yuklanmadi') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await categoriesAPI.remove(confirmDelete.id)
      toast.success("O'chirildi")
      setConfirmDelete(null)
      load()
    } catch { toast.error('Xato') }
    finally { setDeleting(false) }
  }

  return (
    <AdminLayout>
      <AdminHeader title="Kategoriyalar" />
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">Jami <span className="font-semibold text-gray-800">{categories.length}</span> ta kategoriya</p>
          <button
            onClick={() => { setEditItem(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus size={15} /> Qo'shish
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="w-12 h-12 bg-gray-100 rounded-xl mx-auto mb-3" />
                <div className="h-4 bg-gray-100 rounded w-2/3 mx-auto" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 py-20 flex flex-col items-center gap-3 text-gray-400">
            <Grid3x3 size={48} className="text-gray-200" />
            <p className="text-sm">Kategoriyalar yo'q</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative group hover:shadow-md transition-shadow">
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditItem(cat); setShowModal(true) }} className="p-1.5 hover:bg-primary/10 rounded-lg text-gray-400 hover:text-primary">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setConfirmDelete(cat)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-3">
                  {cat.image ? (
                    <img
                      src={cat.image.startsWith('http') ? cat.image : `${MEDIA_BASE}${cat.image}`}
                      alt={cat.name_uz}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                      {cat.emoji || '📦'}
                    </div>
                  )}
                  <div className="text-center">
                    <div className="font-semibold text-gray-900 text-sm">{cat.name_uz}</div>
                    {cat.name_ru && <div className="text-xs text-gray-400 mt-0.5">{cat.name_ru}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CategoryModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={load}
        editItem={editItem}
      />

      <ConfirmModal
        open={!!confirmDelete}
        title="Kategoriyani o'chirish"
        description={confirmDelete ? `"${confirmDelete.name_uz}" o'chirilsinmi?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleting}
      />
    </AdminLayout>
  )
}
