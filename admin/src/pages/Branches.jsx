import React, { useState, useEffect } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import ConfirmModal from '../components/ui/ConfirmModal'
import { Plus, Pencil, Trash2, X, Building2, Phone, MapPin, Clock, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { branchesAPI } from '../services/api'

function BranchModal({ open, onClose, onSaved, editItem }) {
  const isEdit = !!editItem
  const empty = { name: '', address: '', phone: '', working_hours: '', latitude: '', longitude: '', is_active: 1 }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(editItem ? { ...empty, ...editItem } : empty)
  }, [open, editItem])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Filial nomi kerak')
    setSaving(true)
    try {
      const payload = {
        ...form,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      }
      if (isEdit) await branchesAPI.update(editItem.id, payload)
      else await branchesAPI.create(payload)
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Filialni tahrirlash' : 'Yangi filial'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Filial nomi *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" placeholder="Chilonzor filiali" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Manzil</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" placeholder="Toshkent, Chilonzor, ..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Telefon</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" placeholder="+998 90 000 00 00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Ish vaqti</label>
              <input value={form.working_hours} onChange={e => set('working_hours', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" placeholder="09:00 - 21:00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Latitude</label>
              <input type="number" step="any" value={form.latitude} onChange={e => set('latitude', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" placeholder="41.2995" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Longitude</label>
              <input type="number" step="any" value={form.longitude} onChange={e => set('longitude', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" placeholder="69.2401" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <button type="button" onClick={() => set('is_active', form.is_active ? 0 : 1)} className="text-primary">
              {form.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-gray-400" />}
            </button>
            <span className="text-sm text-gray-700">Faol filial</span>
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

export default function Branches() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setList(await branchesAPI.list()) }
    catch { toast.error('Yuklanmadi') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await branchesAPI.remove(confirmDelete.id)
      toast.success("O'chirildi")
      setConfirmDelete(null)
      load()
    } catch { toast.error('Xato') }
    finally { setDeleting(false) }
  }

  const handleToggle = async (item) => {
    try {
      await branchesAPI.update(item.id, { is_active: item.is_active ? 0 : 1 })
      setList(prev => prev.map(b => b.id === item.id ? { ...b, is_active: b.is_active ? 0 : 1 } : b))
    } catch { toast.error('Xato') }
  }

  return (
    <AdminLayout>
      <AdminHeader title="Filiallar" />
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">Jami <span className="font-semibold text-gray-800">{list.length}</span> ta filial</p>
          <button
            onClick={() => { setEditItem(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus size={15} /> Filial qo'shish
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="h-3 bg-gray-50 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-50 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 py-20 flex flex-col items-center gap-3 text-gray-400">
            <Building2 size={48} className="text-gray-200" />
            <p className="text-sm">Filiallar yo'q</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {list.map(item => (
              <div key={item.id} className={`bg-white rounded-2xl border shadow-sm p-5 relative group ${item.is_active ? 'border-gray-100' : 'border-gray-100 opacity-70'}`}>
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditItem(item); setShowModal(true) }} className="p-1.5 hover:bg-primary/10 rounded-lg text-gray-400 hover:text-primary">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setConfirmDelete(item)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.is_active ? 'bg-primary/10' : 'bg-gray-100'}`}>
                    <Building2 size={18} className={item.is_active ? 'text-primary' : 'text-gray-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                      <button onClick={() => handleToggle(item)} className="ml-auto">
                        {item.is_active
                          ? <ToggleRight size={18} className="text-primary" />
                          : <ToggleLeft size={18} className="text-gray-400" />}
                      </button>
                    </div>
                    {item.address && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <MapPin size={11} className="text-gray-400 shrink-0" />
                        <span className="truncate">{item.address}</span>
                      </div>
                    )}
                    {item.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <Phone size={11} className="text-gray-400 shrink-0" />
                        <span>{item.phone}</span>
                      </div>
                    )}
                    {item.working_hours && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <Clock size={11} className="text-gray-400 shrink-0" />
                        <span>{item.working_hours}</span>
                      </div>
                    )}
                    {item.latitude && item.longitude && (
                      <a
                        href={`https://maps.google.com/?q=${item.latitude},${item.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        <MapPin size={10} /> Xaritada ko'rish
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BranchModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={load}
        editItem={editItem}
      />

      <ConfirmModal
        open={!!confirmDelete}
        title="Filialni o'chirish"
        description={confirmDelete ? `"${confirmDelete.name}" o'chirilsinmi?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleting}
      />
    </AdminLayout>
  )
}
