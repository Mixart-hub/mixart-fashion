import React, { useState, useEffect, useCallback, useRef } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import ConfirmModal from '../components/ui/ConfirmModal'
import Pagination from '../components/ui/Pagination'
import { Plus, Search, ChevronDown, ChevronUp, Pencil, Trash2, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffAPI, settingsAPI } from '../services/api'
import { formatPrice } from '../utils/formatters'

const PER_PAGE = 20

const ROLES = ['Barchasi', 'super_admin', 'admin', 'branch_manager', 'operator', 'seller']

const ROLE_COLORS = {
  super_admin:    'bg-purple-50 text-purple-700 border-purple-100',
  admin:          'bg-pink-50 text-pink-700 border-pink-100',
  branch_manager: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  operator:       'bg-blue-50 text-blue-700 border-blue-100',
  seller:         'bg-emerald-50 text-emerald-700 border-emerald-100',
}

const ROLE_LABEL = {
  super_admin:    'Super Admin',
  admin:          'Admin',
  branch_manager: 'Filial Menejeri',
  operator:       'Operator',
  seller:         'Seller',
}

const HARDCODED_TASKS = [
  { label: "Mahsulotlar katalogini yangilash", status: "Bajarildi" },
  { label: "Kutilayotgan buyurtmalarni qayta ishlash", status: "Jarayonda" },
  { label: "Oylik inventarizatsiya", status: "Kutilmoqda" },
]

const TASK_COLORS = {
  "Bajarildi":   "bg-emerald-50 text-emerald-700",
  "Jarayonda":   "bg-blue-50 text-blue-700",
  "Kutilmoqda":  "bg-orange-50 text-orange-700",
}

function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase() || '').join('')
}

// ─── Staff Modal ─────────────────────────────────────────────────────────────
function StaffModal({ open, onClose, onSaved, branches, editStaff }) {
  const isEdit = !!editStaff
  const empty = {
    full_name: '', email: '', phone: '', role: 'seller',
    branch_id: '', basic_salary: '', allowances: '', deductions: '',
  }
  const [form, setForm]     = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (editStaff) {
        setForm({
          full_name:    editStaff.full_name || editStaff.name || '',
          email:        editStaff.email || '',
          phone:        editStaff.phone || '',
          role:         editStaff.role || 'seller',
          branch_id:    editStaff.branch_id ?? '',
          basic_salary: editStaff.basic_salary ?? '',
          allowances:   editStaff.allowances ?? '',
          deductions:   editStaff.deductions ?? '',
        })
      } else {
        setForm(empty)
      }
    }
  }, [open, editStaff])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.full_name.trim()) return toast.error("Ism familiya kiritilishi shart")
    if (!form.email.trim())     return toast.error("Email kiritilishi shart")
    if (!form.role)             return toast.error("Rol tanlanishi shart")
    setSaving(true)
    try {
      const payload = {
        name:         form.full_name.trim(),
        email:        form.email.trim(),
        phone:        form.phone.trim(),
        role:         form.role,
        branch_id:    form.branch_id || null,
        basic_salary: form.basic_salary ? Number(form.basic_salary) : 0,
        allowances:   form.allowances  ? Number(form.allowances)  : 0,
        deductions:   form.deductions  ? Number(form.deductions)  : 0,
      }
      if (!isEdit) payload.password = 'mixart123'
      if (isEdit) {
        await staffAPI.update(editStaff.id, payload)
      } else {
        await staffAPI.create(payload)
      }
      toast.success("Xodim saqlandi!")
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
            {isEdit ? "Xodimni tahrirlash" : "Yangi xodim"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Ism familiya <span className="text-red-400">*</span>
            </label>
            <input
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="Aziz Karimov"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="aziz@mixart.uz"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Telefon</label>
            <input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+998 90 123 45 67"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          {/* Role + Branch */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Rol <span className="text-red-400">*</span>
              </label>
              <select
                value={form.role}
                onChange={e => set('role', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-white"
              >
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="branch_manager">Filial Menejeri</option>
                <option value="operator">Operator</option>
                <option value="seller">Seller</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Filial <span className="text-red-400">*</span>
              </label>
              <select
                value={form.branch_id}
                onChange={e => set('branch_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-white"
              >
                <option value="">— Filial —</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Salary */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Asosiy maosh</label>
              <input
                type="number"
                value={form.basic_salary}
                onChange={e => set('basic_salary', e.target.value)}
                placeholder="3000000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Qo'shimcha</label>
              <input
                type="number"
                value={form.allowances}
                onChange={e => set('allowances', e.target.value)}
                placeholder="300000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Ushlab qolish</label>
              <input
                type="number"
                value={form.deductions}
                onChange={e => set('deductions', e.target.value)}
                placeholder="100000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          {/* Default password info */}
          {!isEdit && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <span className="text-amber-500 text-sm font-bold mt-0.5">!</span>
              <p className="text-xs text-amber-700">
                Yangi xodim uchun standart parol: <span className="font-mono font-semibold">mixart123</span>.
                Xodim tizimga kirgach o'zgartirishi kerak.
              </p>
            </div>
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

// ─── Expanded Row ─────────────────────────────────────────────────────────────
function ExpandedRow({ staff }) {
  const basic    = Number(staff.basic_salary || 0)
  const allow    = Number(staff.allowances   || 0)
  const deduct   = Number(staff.deductions   || 0)
  const net      = basic + allow - deduct

  return (
    <tr>
      <td colSpan={9} className="bg-primary/5 px-6 py-4 border-b border-gray-100">
        <div className="grid grid-cols-3 gap-4">
          {/* Card 1: Maosh */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Maosh</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Asosiy maosh</span>
                <span className="text-xs font-medium text-gray-800">+{formatPrice(basic)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Qo'shimcha</span>
                <span className="text-xs font-medium text-emerald-600">+{formatPrice(allow)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Ushlab qolish</span>
                <span className="text-xs font-medium text-red-500">-{formatPrice(deduct)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-700">Net</span>
                <span className="text-sm font-bold text-primary">{formatPrice(net)}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Statistika */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Statistika</div>
            <div className="flex items-center justify-center h-16 text-sm text-gray-400">
              Bu oy: 0 ta buyurtma
            </div>
          </div>

          {/* Card 3: Vazifalar */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Vazifalar</div>
            <div className="space-y-2">
              {HARDCODED_TASKS.map(t => (
                <div key={t.label} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-700 leading-snug flex-1">{t.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${TASK_COLORS[t.status]}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-full" />
          <div className="space-y-1.5">
            <div className="h-3.5 bg-gray-100 rounded w-24" />
            <div className="h-2.5 bg-gray-50 rounded w-16" />
          </div>
        </div>
      </td>
      {Array(6).fill(0).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-3.5 bg-gray-100 rounded w-16" /></td>
      ))}
      <td className="px-4 py-3"><div className="h-3.5 bg-gray-100 rounded w-8" /></td>
      <td className="px-4 py-3"><div className="h-3.5 bg-gray-100 rounded w-12" /></td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StaffAdmin() {
  const [staff, setStaff]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [branches, setBranches]         = useState([])
  const [roleFilter, setRoleFilter]     = useState('Barchasi')
  const [branchFilter, setBranchFilter] = useState('')
  const [search, setSearch]             = useState('')
  const [page, setPage]                 = useState(1)
  const [total, setTotal]               = useState(0)
  const [totalPages, setTotalPages]     = useState(1)
  const [expanded, setExpanded]         = useState(null)
  const [showModal, setShowModal]       = useState(false)
  const [editStaff, setEditStaff]       = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [toggling, setToggling]         = useState(null)

  const debounceRef = useRef(null)

  // Load branches once
  useEffect(() => {
    settingsAPI.branches()
      .then(res => setBranches(Array.isArray(res) ? res : res?.branches || []))
      .catch(() => {})
  }, [])

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const params = { page: p, limit: PER_PAGE }
      if (roleFilter !== 'Barchasi') params.role = roleFilter
      if (branchFilter) params.branch = branchFilter
      if (search.trim()) params.search = search.trim()
      const res = await staffAPI.list(params)
      setStaff(res.staff || res.data || [])
      setTotal(res.total || 0)
      setTotalPages(res.total_pages || res.totalPages || 1)
    } catch {
      toast.error("Xodimlar yuklanmadi")
    } finally {
      setLoading(false)
    }
  }, [page, roleFilter, branchFilter, search])

  // Debounce search/filter changes
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      load(1)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [search, roleFilter, branchFilter])

  useEffect(() => { load(page) }, [page])

  const handleToggleActive = async (member) => {
    const newVal = member.is_active ? 0 : 1
    setToggling(member.id)
    try {
      await staffAPI.update(member.id, { is_active: newVal })
      toast.success(newVal ? "Faollashtirildi" : "To'xtatildi")
      setStaff(prev => prev.map(s => s.id === member.id ? { ...s, is_active: newVal } : s))
    } catch {
      toast.error("Xato yuz berdi")
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await staffAPI.remove(confirmDelete.id)
      toast.success("Xodim o'chirildi!")
      setConfirmDelete(null)
      load(page)
    } catch {
      toast.error("O'chirishda xato")
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (member) => {
    setEditStaff(member)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditStaff(null)
  }

  return (
    <AdminLayout>
      <AdminHeader title="Xodimlar" />
      <div className="p-6 space-y-4 overflow-y-auto flex-1">

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Xodim nomi yoki email..."
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary w-52"
              />
            </div>
            {/* Role chips */}
            <div className="flex gap-1">
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium capitalize ${
                    roleFilter === r
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-primary/40'
                  }`}
                >
                  {r === 'Barchasi' ? 'Barchasi' : ROLE_LABEL[r] || r}
                </button>
              ))}
            </div>
            {/* Branch select */}
            <div className="relative">
              <select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="">Filial: Barchasi</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={() => { setEditStaff(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Xodim qo'shish
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                {['Xodim', 'Rol', 'Filial', 'Telefon', 'Maosh', 'Holat', 'Kengaytir', 'Amal'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
                <th className="px-4 py-3 w-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(6).fill(0).map((_, i) => <SkeletonRow key={i} />)
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20">
                    <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
                      <Users size={48} className="text-gray-200" />
                      <p className="text-sm font-medium">Xodimlar topilmadi</p>
                      <p className="text-xs text-gray-300">Qidiruv yoki filtrni o'zgartiring</p>
                    </div>
                  </td>
                </tr>
              ) : (
                staff.map(member => (
                  <React.Fragment key={member.id}>
                    <tr
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === member.id ? null : member.id)}
                    >
                      {/* Avatar + name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                            {getInitials(member.full_name || member.name)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {member.full_name || member.name}
                            </div>
                            <div className="text-xs text-gray-400">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      {/* Role badge */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {ROLE_LABEL[member.role] || member.role}
                        </span>
                      </td>
                      {/* Branch */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {member.branch_name || member.branch || '—'}
                      </td>
                      {/* Phone */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {member.phone || '—'}
                      </td>
                      {/* Salary */}
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">
                        {member.basic_salary ? formatPrice(member.basic_salary) : '—'}
                      </td>
                      {/* Active toggle */}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={toggling === member.id}
                            onClick={() => handleToggleActive(member)}
                            className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                              member.is_active ? 'bg-emerald-400' : 'bg-gray-200'
                            } ${toggling === member.id ? 'opacity-50' : ''}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${member.is_active ? 'translate-x-4' : ''}`} />
                          </button>
                          <span className="text-xs text-gray-500">
                            {member.is_active ? 'Faol' : 'Faol emas'}
                          </span>
                        </div>
                      </td>
                      {/* Expand arrow */}
                      <td className="px-4 py-3 text-gray-400">
                        {expanded === member.id
                          ? <ChevronUp size={14} />
                          : <ChevronDown size={14} />
                        }
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(member)}
                            className="p-1.5 hover:bg-primary/10 rounded-lg text-gray-400 hover:text-primary transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(member)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                      {/* Extra spacer col */}
                      <td />
                    </tr>

                    {/* Expanded detail */}
                    {expanded === member.id && <ExpandedRow staff={member} />}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>

          {!loading && staff.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              perPage={PER_PAGE}
              onChange={setPage}
            />
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <StaffModal
        open={showModal}
        onClose={handleModalClose}
        onSaved={() => load(page)}
        branches={branches}
        editStaff={editStaff}
      />

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Xodimni o'chirish"
        description={confirmDelete ? `"${confirmDelete.full_name || confirmDelete.name}" o'chirilsinmi?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleting}
      />
    </AdminLayout>
  )
}
