import React, { useState, useEffect, useRef } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import ConfirmModal from '../components/ui/ConfirmModal'
import { Send, Megaphone, Plus, Pencil, Trash2, X, Newspaper, ToggleLeft, ToggleRight, Upload, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { marketingAPI, uploadAPI, bannersAPI } from '../services/api'

const MEDIA_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')

// ── Push Notification Tab ──────────────────────────────────────────────────────
function PushTab() {
  const [form, setForm] = useState({ title: '', body: '', target: 'all' })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSend = async () => {
    if (!form.title.trim()) return toast.error('Sarlavha kerak')
    if (!form.body.trim()) return toast.error('Matn kerak')
    setSending(true)
    try {
      const res = await marketingAPI.sendPush(form)
      setResult(res)
      toast.success(`${res.sent_to} ta foydalanuvchiga yuborildi!`)
      setForm({ title: '', body: '', target: 'all' })
    } catch (e) { toast.error(e?.detail || 'Xato yuz berdi') }
    finally { setSending(false) }
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Megaphone size={18} className="text-primary" />
          Push xabar yuborish
        </h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Sarlavha <span className="text-gray-400">({form.title.length}/50)</span>
          </label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value.slice(0, 50))}
            placeholder="Yangi kolleksiya keldi!"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Xabar <span className="text-gray-400">({form.body.length}/200)</span>
          </label>
          <textarea
            value={form.body}
            onChange={e => set('body', e.target.value.slice(0, 200))}
            placeholder="Barcha mahsulotlarda 20% chegirma..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Kimga</label>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Barcha' },
              { value: 'active', label: 'Faol (30 kun)' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('target', opt.value)}
                className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-all ${
                  form.target === opt.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50'
                }`}
              >{opt.label}</button>
            ))}
          </div>
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !form.title.trim() || !form.body.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Send size={15} />
          {sending ? 'Yuborilmoqda...' : 'Yuborish'}
        </button>
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            ✅ {result.sent_to} ta foydalanuvchiga muvaffaqiyatli yuborildi
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-gray-700 text-sm">Ko'rinish (Preview)</h3>
        <div className="w-64 mx-auto">
          <div className="bg-[#1C1C1E] rounded-3xl p-4 shadow-xl">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center shrink-0 text-sm">🛍️</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 truncate">
                    {form.title || 'Sarlavha...'}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                    {form.body || 'Xabar matni...'}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">Mixart Fashion • hozir</div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center text-xs text-gray-400 mt-2">Telefon bildirishnomasi</div>
        </div>
      </div>
    </div>
  )
}

// ── News Modal ─────────────────────────────────────────────────────────────────
function NewsModal({ open, onClose, onSaved, editItem }) {
  const isEdit = !!editItem
  const empty = { title_uz: '', title_ru: '', body_uz: '', body_ru: '', image: '', tag: 'news', is_active: 1 }
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
    } catch { toast.error('Rasm yuklanmadi') }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleSave = async () => {
    if (!form.title_uz.trim()) return toast.error('Sarlavha kerak')
    setSaving(true)
    try {
      if (isEdit) await marketingAPI.newsUpdate(editItem.id, form)
      else await marketingAPI.newsCreate(form)
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Yangilik tahrirlash' : 'Yangi yangilik'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Sarlavha (UZ) *</label>
            <input value={form.title_uz} onChange={e => set('title_uz', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Sarlavha (RU)</label>
            <input value={form.title_ru} onChange={e => set('title_ru', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Matn (UZ)</label>
            <textarea value={form.body_uz} onChange={e => set('body_uz', e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Matn (RU)</label>
            <textarea value={form.body_ru} onChange={e => set('body_ru', e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Rasm</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {form.image ? (
              <div className="relative h-32 rounded-xl overflow-hidden border border-gray-200 group">
                <img src={form.image.startsWith('http') ? form.image : `${MEDIA_BASE}${form.image}`} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => set('image', '')} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                  <X size={20} className="text-white" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-primary/50 disabled:opacity-50">
                <Upload size={15} />{uploading ? 'Yuklanmoqda...' : 'Rasm yuklash'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Tag</label>
              <select value={form.tag} onChange={e => set('tag', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-white">
                <option value="news">Yangilik</option>
                <option value="promo">Aksiya</option>
                <option value="campaign">Kampaniya</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <button type="button" onClick={() => set('is_active', form.is_active ? 0 : 1)} className="text-primary">
                  {form.is_active ? <ToggleRight size={26} /> : <ToggleLeft size={26} className="text-gray-400" />}
                </button>
                <span className="text-sm text-gray-700">Faol</span>
              </label>
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

// ── News Tab ───────────────────────────────────────────────────────────────────
function NewsTab() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setList(await marketingAPI.newsList()) }
    catch { toast.error('Yuklanmadi') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await marketingAPI.newsDelete(confirmDelete.id)
      toast.success("O'chirildi")
      setConfirmDelete(null)
      load()
    } catch { toast.error('Xato') }
    finally { setDeleting(false) }
  }

  const TAG_COLORS = { news: 'bg-blue-100 text-blue-700', promo: 'bg-orange-100 text-orange-700', campaign: 'bg-green-100 text-green-700' }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Jami <span className="font-semibold text-gray-800">{list.length}</span> ta yangilik</p>
        <button
          onClick={() => { setEditItem(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus size={15} /> Qo'shish
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse flex gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-50 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 flex flex-col items-center gap-3 text-gray-400">
          <Newspaper size={48} className="text-gray-200" />
          <p className="text-sm">Yangiliklar yo'q</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
              {item.image ? (
                <img
                  src={item.image.startsWith('http') ? item.image : `${MEDIA_BASE}${item.image}`}
                  alt={item.title_uz}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Newspaper size={22} className="text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{item.title_uz}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${TAG_COLORS[item.tag] || 'bg-gray-100 text-gray-600'}`}>
                    {item.tag}
                  </span>
                  {!item.is_active && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Nofaol</span>}
                </div>
                {item.body_uz && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.body_uz}</p>}
                <p className="text-[11px] text-gray-300 mt-1">{item.created_at?.slice(0, 10)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setEditItem(item); setShowModal(true) }} className="p-1.5 hover:bg-primary/10 rounded-lg text-gray-400 hover:text-primary">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setConfirmDelete(item)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewsModal open={showModal} onClose={() => setShowModal(false)} onSaved={load} editItem={editItem} />
      <ConfirmModal
        open={!!confirmDelete}
        title="Yangilikni o'chirish"
        description={confirmDelete ? `"${confirmDelete.title_uz}" o'chirilsinmi?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleting}
      />
    </div>
  )
}

// ── Banners Tab ────────────────────────────────────────────────────────────────
function BannerModal({ open, onClose, onSaved, editItem }) {
  const isEdit = !!editItem
  const empty = { image: '', title: '', subtitle: '', link: '', sort_order: 0, is_active: 1 }
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
    } catch { toast.error('Rasm yuklanmadi') }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleSave = async () => {
    if (!form.image) return toast.error('Rasm kerak')
    setSaving(true)
    try {
      if (isEdit) await bannersAPI.update(editItem.id, form)
      else await bannersAPI.create(form)
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
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Banner tahrirlash' : 'Yangi banner'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Rasm *</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {form.image ? (
              <div className="relative h-32 rounded-xl overflow-hidden border border-gray-200 group">
                <img src={form.image.startsWith('http') ? form.image : `${MEDIA_BASE}${form.image}`} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => set('image', '')} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                  <X size={20} className="text-white" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-primary/50 disabled:opacity-50">
                <Upload size={15} />{uploading ? 'Yuklanmoqda...' : 'Banner rasmini yuklash'}
              </button>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Sarlavha</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" placeholder="Yangi kolleksiya" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Qo'shimcha matn</label>
            <input value={form.subtitle} onChange={e => set('subtitle', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" placeholder="Chegirmalar bilan" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Havola (link)</label>
              <input value={form.link} onChange={e => set('link', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" placeholder="/catalog" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Tartib</label>
              <input type="number" value={form.sort_order} onChange={e => set('sort_order', Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <button type="button" onClick={() => set('is_active', form.is_active ? 0 : 1)} className="text-primary">
              {form.is_active ? <ToggleRight size={26} /> : <ToggleLeft size={26} className="text-gray-400" />}
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

function BannersTab() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setList(await bannersAPI.list()) }
    catch { toast.error('Yuklanmadi') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await bannersAPI.remove(confirmDelete.id)
      toast.success("O'chirildi")
      setConfirmDelete(null)
      load()
    } catch { toast.error('Xato') }
    finally { setDeleting(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Jami <span className="font-semibold text-gray-800">{list.length}</span> ta banner</p>
        <button onClick={() => { setEditItem(null); setShowModal(true) }} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus size={15} /> Qo'shish
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 flex flex-col items-center gap-3 text-gray-400">
          <ImageIcon size={48} className="text-gray-200" />
          <p className="text-sm">Bannerlar yo'q</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(item => (
            <div key={item.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden flex items-center gap-4 ${item.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
              {item.image ? (
                <img src={item.image.startsWith('http') ? item.image : `${MEDIA_BASE}${item.image}`} alt="" className="w-24 h-16 object-cover shrink-0" />
              ) : (
                <div className="w-24 h-16 bg-gray-100 flex items-center justify-center shrink-0"><ImageIcon size={20} className="text-gray-300" /></div>
              )}
              <div className="flex-1 min-w-0 py-2">
                {item.title && <div className="font-semibold text-sm text-gray-900">{item.title}</div>}
                {item.subtitle && <div className="text-xs text-gray-400 mt-0.5">{item.subtitle}</div>}
                {item.link && <div className="text-xs text-primary mt-0.5">→ {item.link}</div>}
                <div className="text-xs text-gray-300 mt-0.5">Tartib: {item.sort_order}</div>
              </div>
              <div className="flex items-center gap-2 pr-4 shrink-0">
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${item.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {item.is_active ? 'Faol' : 'Nofaol'}
                </span>
                <button onClick={() => { setEditItem(item); setShowModal(true) }} className="p-1.5 hover:bg-primary/10 rounded-lg text-gray-400 hover:text-primary">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setConfirmDelete(item)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BannerModal open={showModal} onClose={() => setShowModal(false)} onSaved={load} editItem={editItem} />
      <ConfirmModal
        open={!!confirmDelete}
        title="Bannerni o'chirish"
        description={confirmDelete ? `Bu bannerni o'chirishni tasdiqlaysizmi?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleting}
      />
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Marketing() {
  const [tab, setTab] = useState('push')
  return (
    <AdminLayout>
      <AdminHeader title="Marketing" />
      <div className="p-6 flex-1 overflow-y-auto space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {[
            { key: 'push', label: 'Push xabarlar', icon: Megaphone },
            { key: 'news', label: 'Yangiliklar', icon: Newspaper },
            { key: 'banners', label: 'Bannerlar', icon: ImageIcon },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {tab === 'push' ? <PushTab /> : tab === 'news' ? <NewsTab /> : <BannersTab />}
      </div>
    </AdminLayout>
  )
}
