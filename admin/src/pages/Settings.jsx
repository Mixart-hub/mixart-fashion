import React, { useState, useEffect } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import { settingsAPI } from '../services/api'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Info, Store, CreditCard, Bell, Lock, Package,
  Eye, EyeOff, Save, RefreshCw, Bot, CheckCircle2, XCircle, Loader2
} from 'lucide-react'

function decodeToken(token) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

function getCurrentRole() {
  try {
    const stored = localStorage.getItem('admin_user')
    if (stored) return JSON.parse(stored)?.role
  } catch {}
  const token = localStorage.getItem('admin_token')
  return token ? decodeToken(token)?.role : null
}

const ADMIN_ROLES = ['admin', 'super_admin']

/* ─── Sidebar sections ──────────────────────────────────────────────── */
const ALL_SECTIONS = [
  { id: 'general',       label: 'Umumiy',               icon: Info,    adminOnly: false },
  { id: 'store',         label: "Do'kon ma'lumoti",      icon: Store,   adminOnly: false },
  { id: 'payment',       label: "To'lov usullari",       icon: CreditCard, adminOnly: false },
  { id: 'notifications', label: 'Bildirishnomalar',      icon: Bell,    adminOnly: false },
  { id: 'telegram',      label: 'Telegram Bot',          icon: Bot,     adminOnly: true  },
  { id: 'product_fields', label: 'Mahsulot maydonlari',  icon: Package, adminOnly: true, superOnly: true },
  { id: 'password',      label: "Parolni o'zgartirish",  icon: Lock,    adminOnly: false },
]

/* ─── Reusable components ───────────────────────────────────────────── */
function FieldLabel({ children }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1">{children}</label>
}

function TextInput({ label, value, onChange, type = 'text', placeholder, disabled }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9956C] transition-colors disabled:bg-gray-50 disabled:text-gray-400"
      />
    </div>
  )
}

function TextAreaInput({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <textarea
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9956C] transition-colors resize-none"
      />
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full flex items-center px-0.5 cursor-pointer transition-colors shrink-0 ${
        checked ? 'bg-[#C9956C]' : 'bg-gray-200'
      }`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </div>
  )
}

function SaveButton({ loading, onClick, label = 'Saqlash' }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 bg-[#C9956C] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#b8835a] disabled:opacity-50 transition-colors mt-4"
    >
      {loading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
      {loading ? 'Saqlanmoqda...' : label}
    </button>
  )
}

function SectionTitle({ children }) {
  return <h2 className="text-lg font-semibold text-gray-900 mb-5">{children}</h2>
}

/* ─── PAYMENT CARD ──────────────────────────────────────────────────── */
function PaymentCard({ title, enabled, merchantId, secretKey, onToggle, onMerchantChange, onSecretChange }) {
  const [showSecret, setShowSecret] = useState(false)

  return (
    <div className={`bg-white rounded-xl border p-5 space-y-3 transition-all ${
      enabled ? 'border-[#C9956C]/30 shadow-sm' : 'border-gray-100'
    }`}>
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-800 text-sm">{title}</div>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>

      {enabled && (
        <>
          <TextInput
            label="Merchant ID"
            value={merchantId}
            onChange={e => onMerchantChange(e.target.value)}
            placeholder="Merchant ID kiriting"
          />
          <div>
            <FieldLabel>Secret Key</FieldLabel>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secretKey ?? ''}
                onChange={e => onSecretChange(e.target.value)}
                placeholder="Secret key kiriting"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:border-[#C9956C] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowSecret(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── NOTIFICATION BLOCK ─────────────────────────────────────────────── */
function NotifBlock({ title, enabled, onToggle, children }) {
  return (
    <div className={`bg-white rounded-xl border p-5 space-y-3 transition-all ${
      enabled ? 'border-[#C9956C]/30 shadow-sm' : 'border-gray-100'
    }`}>
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-800 text-sm">{title}</div>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>
      {enabled && <div className="space-y-3 pt-1">{children}</div>}
    </div>
  )
}

/* ─── MAIN COMPONENT ────────────────────────────────────────────────── */
export default function Settings() {
  const [section, setSection] = useState('general')
  const [settings, setSettings] = useState({})
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [saving, setSaving] = useState(false)

  const currentRole = getCurrentRole()
  const isAdmin = ADMIN_ROLES.includes(currentRole)
  const isSuperAdmin = currentRole === 'super_admin'
  const SECTIONS = ALL_SECTIONS.filter(s => {
    if (s.superOnly) return isSuperAdmin
    if (s.adminOnly) return isAdmin
    return true
  })

  /* Password change state */
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })

  /* Product field config state */
  const [fieldConfig, setFieldConfig] = useState({})
  const [fieldSaving, setFieldSaving] = useState(false)

  /* Telegram bot state */
  const [tgToken, setTgToken] = useState('')
  const [tgChatId, setTgChatId] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [tgSaving, setTgSaving] = useState(false)
  const [tgTesting, setTgTesting] = useState(false)
  const [tgTestResult, setTgTestResult] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await settingsAPI.get()
        setSettings(data || {})
        if (data?.telegram_bot_token) setTgToken(data.telegram_bot_token)
        if (data?.telegram_chat_id)   setTgChatId(data.telegram_chat_id)
        try {
          const fc = await settingsAPI.productFields()
          if (fc && typeof fc === 'object') setFieldConfig(fc)
        } catch {}
      } catch {
        toast.error("Sozlamalarni yuklashda xatolik")
      } finally {
        setLoadingSettings(false)
      }
    }
    load()
  }, [])

  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))

  /* Generic save wrapper */
  const saveSettings = async (fields) => {
    setSaving(true)
    try {
      const payload = {}
      fields.forEach(k => { if (settings[k] !== undefined) payload[k] = settings[k] })
      await settingsAPI.update(payload)
      toast.success('Saqlandi!')
    } catch {
      toast.error('Saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  /* Password change */
  const handlePasswordChange = async () => {
    const { current_password, new_password, confirm_password } = pwForm
    if (!current_password || !new_password || !confirm_password) {
      toast.error('Barcha maydonlarni to\'ldiring')
      return
    }
    if (new_password.length < 6) {
      toast.error('Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak')
      return
    }
    if (new_password !== confirm_password) {
      toast.error('Yangi parollar mos kelmadi')
      return
    }
    setPwSaving(true)
    try {
      await api.put('/auth/change-password', { current_password, new_password })
      toast.success('Parol muvaffaqiyatli o\'zgartirildi!')
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err?.message || 'Joriy parol noto\'g\'ri')
    } finally {
      setPwSaving(false)
    }
  }

  const setPw = (key, value) => setPwForm(prev => ({ ...prev, [key]: value }))
  const togglePwShow = (key) => setShowPw(prev => ({ ...prev, [key]: !prev[key] }))

  const saveFieldConfig = async () => {
    setFieldSaving(true)
    try {
      await settingsAPI.updateProductFields(fieldConfig)
      toast.success('Maydon sozlamalari saqlandi!')
    } catch (e) {
      toast.error(e?.detail || 'Saqlashda xatolik')
    } finally {
      setFieldSaving(false)
    }
  }

  const saveTelegramBot = async () => {
    if (!tgToken.trim()) { toast.error("Token kerak"); return }
    setTgSaving(true)
    try {
      await api.put('/settings/telegram-bot', { token: tgToken.trim(), chat_id: tgChatId.trim() })
      toast.success('Telegram bot token saqlandi!')
      setTgTestResult(null)
    } catch (e) {
      toast.error(e?.detail || 'Saqlashda xatolik')
    } finally {
      setTgSaving(false)
    }
  }

  const testTelegramBot = async () => {
    setTgTesting(true)
    setTgTestResult(null)
    try {
      const r = await api.post('/settings/telegram-bot/test', { token: tgToken.trim() })
      setTgTestResult(r)
    } catch (e) {
      setTgTestResult({ ok: false, message: e?.detail || e?.message || "Ulanib bo'lmadi" })
    } finally {
      setTgTesting(false)
    }
  }

  if (loadingSettings) {
    return (
      <AdminLayout>
        <AdminHeader title="Sozlamalar" />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw size={24} className="text-gray-300 animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <AdminHeader title="Sozlamalar" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-100 p-4 shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  section === id
                    ? 'bg-[#C9956C]/10 text-[#C9956C] font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ─── UMUMIY ─────────────────────────────────────────────── */}
          {section === 'general' && (
            <div className="max-w-lg space-y-4">
              <SectionTitle>Umumiy sozlamalar</SectionTitle>

              <TextInput
                label="Do'kon nomi"
                value={settings.store_name}
                onChange={e => set('store_name', e.target.value)}
                placeholder="Mixart Fashion"
              />

              <div>
                <FieldLabel>Valyuta</FieldLabel>
                <select
                  value={settings.currency || 'UZS'}
                  onChange={e => set('currency', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9956C]"
                >
                  <option value="UZS">UZS — So'm</option>
                  <option value="USD">USD — Dollar</option>
                </select>
              </div>

              <div>
                <FieldLabel>Vaqt mintaqasi</FieldLabel>
                <select
                  value={settings.timezone || 'Asia/Tashkent'}
                  onChange={e => set('timezone', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9956C]"
                >
                  <option value="Asia/Tashkent">Asia/Tashkent (UTC+5)</option>
                  <option value="Asia/Samarkand">Asia/Samarkand (UTC+5)</option>
                </select>
              </div>

              <SaveButton
                loading={saving}
                onClick={() => saveSettings(['store_name', 'currency', 'timezone'])}
              />
            </div>
          )}

          {/* ─── DO'KON MA'LUMOTI ────────────────────────────────────── */}
          {section === 'store' && (
            <div className="max-w-lg space-y-4">
              <SectionTitle>Do'kon ma'lumoti</SectionTitle>

              <TextAreaInput
                label="Manzil"
                value={settings.store_address}
                onChange={e => set('store_address', e.target.value)}
                placeholder="Chilonzor tumani, Bunyodkor ko'chasi 45"
              />

              <TextInput
                label="Telefon"
                value={settings.store_phone}
                onChange={e => set('store_phone', e.target.value)}
                placeholder="+998 90 123 45 67"
              />

              <TextInput
                label="Email"
                value={settings.store_email}
                onChange={e => set('store_email', e.target.value)}
                placeholder="info@mixart.uz"
                type="email"
              />

              <TextInput
                label="Ish vaqti"
                value={settings.working_hours}
                onChange={e => set('working_hours', e.target.value)}
                placeholder="09:00 - 21:00"
              />

              <SaveButton
                loading={saving}
                onClick={() => saveSettings(['store_address', 'store_phone', 'store_email', 'working_hours'])}
              />
            </div>
          )}

          {/* ─── TO'LOV USULLARI ─────────────────────────────────────── */}
          {section === 'payment' && (
            <div className="max-w-xl space-y-4">
              <SectionTitle>To'lov usullari</SectionTitle>

              <PaymentCard
                title="CLICK"
                enabled={settings.click_enabled === 'true' || settings.click_enabled === true}
                merchantId={settings.click_merchant_id}
                secretKey={settings.click_secret_key}
                onToggle={v => set('click_enabled', v ? 'true' : 'false')}
                onMerchantChange={v => set('click_merchant_id', v)}
                onSecretChange={v => set('click_secret_key', v)}
              />

              <PaymentCard
                title="Payme"
                enabled={settings.payme_enabled === 'true' || settings.payme_enabled === true}
                merchantId={settings.payme_merchant_id}
                secretKey={settings.payme_secret_key}
                onToggle={v => set('payme_enabled', v ? 'true' : 'false')}
                onMerchantChange={v => set('payme_merchant_id', v)}
                onSecretChange={v => set('payme_secret_key', v)}
              />

              <SaveButton
                loading={saving}
                onClick={() => saveSettings([
                  'click_enabled', 'click_merchant_id', 'click_secret_key',
                  'payme_enabled', 'payme_merchant_id', 'payme_secret_key',
                ])}
              />
            </div>
          )}

          {/* ─── BILDIRISHNOMALAR ────────────────────────────────────── */}
          {section === 'notifications' && (
            <div className="max-w-lg space-y-4">
              <SectionTitle>Bildirishnomalar</SectionTitle>

              {/* Email */}
              <NotifBlock
                title="Email bildirishnomalar"
                enabled={settings.email_notifications === 'true' || settings.email_notifications === true}
                onToggle={v => set('email_notifications', v ? 'true' : 'false')}
              >
                <TextInput
                  label="Email manzil"
                  value={settings.email_address}
                  onChange={e => set('email_address', e.target.value)}
                  placeholder="notify@mixart.uz"
                  type="email"
                />
              </NotifBlock>

              {/* SMS */}
              <NotifBlock
                title="SMS bildirishnomalar"
                enabled={settings.sms_notifications === 'true' || settings.sms_notifications === true}
                onToggle={v => set('sms_notifications', v ? 'true' : 'false')}
              >
                <TextInput
                  label="Telefon raqam"
                  value={settings.sms_phone}
                  onChange={e => set('sms_phone', e.target.value)}
                  placeholder="+998901234567"
                />
              </NotifBlock>

              {/* Telegram */}
              <NotifBlock
                title="Telegram bildirishnomalar"
                enabled={settings.telegram_notifications === 'true' || settings.telegram_notifications === true}
                onToggle={v => set('telegram_notifications', v ? 'true' : 'false')}
              >
                <TextInput
                  label="Bot token"
                  value={settings.telegram_token}
                  onChange={e => set('telegram_token', e.target.value)}
                  placeholder="123456789:AABBcc..."
                />
                <TextInput
                  label="Chat ID"
                  value={settings.telegram_chat_id}
                  onChange={e => set('telegram_chat_id', e.target.value)}
                  placeholder="-100123456789"
                />
              </NotifBlock>

              <SaveButton
                loading={saving}
                onClick={() => saveSettings([
                  'email_notifications', 'email_address',
                  'sms_notifications', 'sms_phone',
                  'telegram_notifications', 'telegram_token', 'telegram_chat_id',
                ])}
              />
            </div>
          )}

          {/* ─── MAHSULOT MAYDONLARI ────────────────────────────────── */}
          {section === 'product_fields' && isSuperAdmin && (
            <div className="max-w-2xl space-y-5">
              <SectionTitle>Mahsulot maydonlari sozlamasi</SectionTitle>

              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed">
                Bu sozlama xodimlar mahsulot qo'shganda yoki tahrirlaganda qaysi maydonlar <strong>majburiy</strong>, <strong>ixtiyoriy</strong> yoki <strong>yashirin</strong> bo'lishini belgilaydi. Super admin har doim barcha maydonlarni ko'radi.
              </div>

              {/* Always required notice */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="grid grid-cols-[1fr_auto] items-center">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Maydon nomi</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Holati</span>
                  </div>
                </div>

                {/* Fixed required rows */}
                {[
                  { key: 'name_uz', label: "Nomi (UZ)", desc: "Asosiy nom — har doim majburiy" },
                  { key: 'price',   label: "Narxi (so'm)", desc: "Narx — har doim majburiy" },
                ].map(f => (
                  <div key={f.key} className="px-4 py-3.5 border-b border-gray-50 grid grid-cols-[1fr_auto] items-center gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700">{f.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-100 shrink-0">
                      Majburiy (o'zgarmas)
                    </span>
                  </div>
                ))}

                {/* Configurable rows */}
                {[
                  { key: 'sku',         label: 'Article / ID raqami',   desc: 'Mahsulot unikal kodi (barcode, artikul)' },
                  { key: 'name_ru',     label: 'Nomi (RU)',             desc: 'Rus tilidagi nom' },
                  { key: 'old_price',   label: 'Eski narxi',            desc: "Chegirma ko'rsatish uchun" },
                  { key: 'category_id', label: 'Kategoriya',            desc: 'Mahsulot kategoriyasi' },
                  { key: 'sizes',       label: "O'lchamlar",            desc: 'XS, S, M, L, XL, XXL...' },
                  { key: 'colors',      label: 'Ranglar',               desc: 'Mavjud ranglar ro\'yxati' },
                  { key: 'images',      label: 'Rasmlar',               desc: 'Mahsulot rasmlari (upload)' },
                  { key: 'is_trending', label: 'Trend belgisi',         desc: 'Trend mahsulot sifatida belgilash' },
                ].map((f, i, arr) => {
                  const val = fieldConfig[f.key] || 'optional'
                  return (
                    <div key={f.key} className={`px-4 py-3.5 grid grid-cols-[1fr_auto] items-center gap-4 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{f.label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {[
                          { v: 'required', label: 'Majburiy',    cls: 'bg-red-50 text-red-600 border-red-200' },
                          { v: 'optional', label: 'Ixtiyoriy',   cls: 'bg-blue-50 text-blue-600 border-blue-200' },
                          { v: 'hidden',   label: 'Yashirish',   cls: 'bg-gray-100 text-gray-500 border-gray-200' },
                        ].map(opt => (
                          <button
                            key={opt.v}
                            onClick={() => setFieldConfig(prev => ({ ...prev, [f.key]: opt.v }))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                              val === opt.v
                                ? opt.cls + ' ring-1 ring-offset-1'
                                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <SaveButton loading={fieldSaving} onClick={saveFieldConfig} label="Sozlamalarni saqlash" />
            </div>
          )}

          {/* ─── TELEGRAM BOT ───────────────────────────────────────── */}
          {section === 'telegram' && isAdmin && (
            <div className="max-w-lg space-y-5">
              <SectionTitle>Telegram Bot sozlamalari</SectionTitle>

              {/* Info banner */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
                <strong>Qanday olish:</strong> @BotFather ga yozing → /newbot → token oling.<br />
                Token saqlangandan keyin server qayta ishga tushirilganda kuchga kiradi.
              </div>

              {/* Token */}
              <div>
                <FieldLabel>Bot Token</FieldLabel>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={tgToken}
                    onChange={e => { setTgToken(e.target.value); setTgTestResult(null) }}
                    placeholder="123456789:AABBccDDeeff..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10 font-mono focus:outline-none focus:border-[#C9956C] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Chat ID */}
              <TextInput
                label="Admin Chat ID (buyurtma bildirishnomalari uchun)"
                value={tgChatId}
                onChange={e => setTgChatId(e.target.value)}
                placeholder="-100123456789 yoki shaxsiy ID"
              />

              {/* Test result */}
              {tgTestResult && (
                <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm ${
                  tgTestResult.ok ? 'bg-green-50 border border-green-100 text-green-700' : 'bg-red-50 border border-red-100 text-red-600'
                }`}>
                  {tgTestResult.ok
                    ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                    : <XCircle size={16} className="shrink-0 mt-0.5" />
                  }
                  <div>
                    {tgTestResult.ok
                      ? <>Bot ulandi: <strong>@{tgTestResult.bot?.username}</strong> ({tgTestResult.bot?.first_name})</>
                      : tgTestResult.message
                    }
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={testTelegramBot}
                  disabled={tgTesting || !tgToken.trim()}
                  className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {tgTesting ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                  {tgTesting ? 'Tekshirilmoqda...' : 'Tokenni tekshirish'}
                </button>
                <SaveButton loading={tgSaving} onClick={saveTelegramBot} />
              </div>
            </div>
          )}

          {/* ─── PAROLNI O'ZGARTIRISH ────────────────────────────────── */}
          {section === 'password' && (
            <div className="max-w-md space-y-4">
              <SectionTitle>Parolni o'zgartirish</SectionTitle>

              {/* Current password */}
              <div>
                <FieldLabel>Joriy parol</FieldLabel>
                <div className="relative">
                  <input
                    type={showPw.current ? 'text' : 'password'}
                    value={pwForm.current_password}
                    onChange={e => setPw('current_password', e.target.value)}
                    placeholder="Joriy parolni kiriting"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:border-[#C9956C] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => togglePwShow('current')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw.current ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <FieldLabel>Yangi parol</FieldLabel>
                <div className="relative">
                  <input
                    type={showPw.new ? 'text' : 'password'}
                    value={pwForm.new_password}
                    onChange={e => setPw('new_password', e.target.value)}
                    placeholder="Kamida 6 ta belgi"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:border-[#C9956C] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => togglePwShow('new')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw.new ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {/* Strength hint */}
                {pwForm.new_password.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          pwForm.new_password.length > i * 2
                            ? pwForm.new_password.length < 6
                              ? 'bg-red-400'
                              : pwForm.new_password.length < 10
                                ? 'bg-orange-400'
                                : 'bg-emerald-400'
                            : 'bg-gray-100'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-gray-400 shrink-0">
                      {pwForm.new_password.length < 6 ? 'Juda qisqa' : pwForm.new_password.length < 10 ? "O'rtacha" : 'Kuchli'}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <FieldLabel>Yangi parolni tasdiqlang</FieldLabel>
                <div className="relative">
                  <input
                    type={showPw.confirm ? 'text' : 'password'}
                    value={pwForm.confirm_password}
                    onChange={e => setPw('confirm_password', e.target.value)}
                    placeholder="Yangi parolni qayta kiriting"
                    className={`w-full border rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none transition-colors ${
                      pwForm.confirm_password && pwForm.confirm_password !== pwForm.new_password
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-gray-200 focus:border-[#C9956C]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => togglePwShow('confirm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {pwForm.confirm_password && pwForm.confirm_password !== pwForm.new_password && (
                  <p className="text-xs text-red-500 mt-1">Parollar mos kelmadi</p>
                )}
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={pwSaving}
                className="flex items-center gap-2 bg-[#C9956C] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#b8835a] disabled:opacity-50 transition-colors mt-4"
              >
                {pwSaving ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                {pwSaving ? 'Saqlanmoqda...' : "Parolni o'zgartirish"}
              </button>
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  )
}
