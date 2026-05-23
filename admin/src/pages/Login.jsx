import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI, staffAuthAPI } from '../services/api'

const ROLE_LABELS = {
  admin: 'Administrator',
  super_admin: 'Super Admin',
  branch_manager: 'Filial boshqaruvchisi',
  seller: 'Sotuvchi',
  operator: 'Operator',
}

export default function Login() {
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error("Email va parol kiriting")
    setLoading(true)
    try {
      // Try admin (users table) first
      let res = null
      try {
        res = await authAPI.login(form.email, form.password)
        if (res?.access_token) {
          localStorage.setItem('admin_token', res.access_token)
          localStorage.setItem('admin_user', JSON.stringify(res.user || {}))
          toast.success(`Xush kelibsiz!`)
          nav('/', { replace: true })
          return
        }
      } catch {}

      // Try staff login
      res = await staffAuthAPI.login(form.email, form.password)
      if (res?.access_token) {
        localStorage.setItem('admin_token', res.access_token)
        const staffUser = res.staff || {}
        localStorage.setItem('admin_user', JSON.stringify({ ...staffUser, _type: 'staff' }))
        const roleLabel = ROLE_LABELS[staffUser.role] || staffUser.role
        toast.success(`Xush kelibsiz, ${staffUser.name}! (${roleLabel})`)
        nav('/', { replace: true })
      } else {
        toast.error("Noto'g'ri email yoki parol")
      }
    } catch (err) {
      toast.error(err?.detail || "Kirish xatosi yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1C1C1E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/20 rounded-2xl mb-4">
            <Crown size={28} className="text-primary" />
          </div>
          <div className="font-serif text-primary text-2xl font-bold tracking-widest">MIXART</div>
          <div className="text-gray-500 text-sm tracking-widest mt-0.5">FASHION · ADMIN & XODIM</div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Tizimga kirish</h2>
          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@mixart.uz"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Parol</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={show ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Kirish...' : 'Kirish'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">© 2025 Mixart Fashion</p>
      </div>
    </div>
  )
}
