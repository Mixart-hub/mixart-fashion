import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/store'
import { loyaltyAPI, authAPI } from '../../services/api'

const LEVEL_COLORS = {
  bronze: '#b45309',
  silver: '#6b7280',
  gold:   '#d97706',
}

const NEXT_THRESHOLD = { bronze: 150, silver: 500, gold: null }

export default function ProfilePage() {
  const nav = useNavigate()
  const { user, lang, setLang, logout, setUser, setToken } = useStore()
  const [loyalty, setLoyalty] = useState(null)
  const [editPhone, setEditPhone] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    loyaltyAPI.get(user.id).then(setLoyalty).catch(() => {})
  }, [user?.id])

  function loginWithGoogle() {
    window.location.href = '/api/v1/auth/google?redirect_to=twa'
  }

  const level = loyalty?.level || 'bronze'
  const points = loyalty?.points || 0
  const progress = loyalty?.progress || 0
  const referralCode = loyalty?.referral_code || ''
  const nextLevel = loyalty?.next_level
  const nextThreshold = loyalty?.next_threshold
  const discount = loyalty?.discount_percent || 0
  const levelColor = LEVEL_COLORS[level] || LEVEL_COLORS.bronze
  const levelLabel = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' }[level] || level

  function copyReferral() {
    if (!referralCode) return
    navigator.clipboard?.writeText(referralCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  const MENU = [
    ['📦', lang === 'ru' ? 'Мои заказы' : lang === 'en' ? 'My Orders' : 'Buyurtmalarim', '/orders'],
    ['💬', lang === 'ru' ? 'AI Стилист' : lang === 'en' ? 'AI Stylist' : 'Mix AI Stilist', '/ai'],
    ['👗', lang === 'ru' ? 'Каталог' : lang === 'en' ? 'Catalog' : 'Katalog', '/catalog'],
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ background: '#1C1C1E', padding: '20px 16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#C9956C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {user?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{user?.full_name || 'Mehmon'}</div>
            {editPhone ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input value={phoneDraft} onChange={e => setPhoneDraft(e.target.value)}
                  style={{ flex: 1, fontSize: 11, padding: '4px 8px', borderRadius: 6, border: 'none', outline: 'none' }}
                  placeholder="+998..." />
                <button onClick={() => setEditPhone(false)} style={{ fontSize: 11, padding: '4px 8px', background: '#C9956C', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>✓</button>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                {user?.phone || (lang === 'ru' ? 'Телефон не указан' : 'Telefon yo\'q')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: 12 }}>
        {/* Loyalty card */}
        <div style={{ background: 'linear-gradient(135deg,#1C1C1E,#C9956C)', borderRadius: 14, padding: 16, marginBottom: 10, color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>
                {lang === 'ru' ? 'Баллы лояльности' : lang === 'en' ? 'Loyalty Points' : 'Loyallik ballari'}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 2 }}>{points.toLocaleString('ru-RU')}</div>
              {discount > 0 && (
                <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>🎁 {discount}% chegirma faol</div>
              )}
            </div>
            <div style={{ background: levelColor, padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              {levelLabel}
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ background: 'rgba(255,255,255,.2)', borderRadius: 4, height: 5 }}>
            <div style={{ background: '#fff', borderRadius: 4, height: 5, width: `${progress}%`, transition: 'width .5s' }} />
          </div>
          <div style={{ fontSize: 10, opacity: 0.75, marginTop: 4 }}>
            {nextLevel
              ? `${nextLevel.charAt(0).toUpperCase()+nextLevel.slice(1)} uchun: ${progress}%`
              : '👑 Maksimal daraja!'}
          </div>
        </div>

        {/* Referral code */}
        {referralCode && (
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #F3F4F6', padding: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 6 }}>
              🎟 {lang === 'ru' ? 'Реферальный код' : lang === 'en' ? 'Referral Code' : 'Referal kod'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: 2, color: '#C9956C' }}>{referralCode}</div>
              <button onClick={copyReferral} style={{ padding: '6px 12px', background: copied ? '#dcfce7' : '#f3edf0', color: copied ? '#16a34a' : '#C9956C', border: 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                {copied ? '✅' : '📋 Nusxa'}
              </button>
            </div>
          </div>
        )}

        {/* Language */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #F3F4F6', padding: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#1C1C1E', marginBottom: 8 }}>🌐 {lang === 'ru' ? 'Язык интерфейса:' : lang === 'en' ? 'Interface language:' : 'Interfeys tili:'}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['uz', "🇺🇿 O'zbek"], ['ru', '🇷🇺 Русский'], ['en', '🇬🇧 English']].map(([l, label]) => (
              <button key={l} onClick={() => {
                setLang(l)
                if (user?.id) authAPI.updateLang(user.id, l).catch(() => {})
              }} style={{
                flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 10, cursor: 'pointer', border: 'none',
                background: lang === l ? '#C9956C' : '#f3edf0',
                color: lang === l ? '#fff' : '#6B7280',
                fontWeight: lang === l ? 600 : 400
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Menu */}
        {MENU.map(([icon, label, path], i) => (
          <button key={i} onClick={() => nav(path)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', background: '#fff', border: '0.5px solid #F3F4F6',
            borderRadius: 12, marginBottom: 6, cursor: 'pointer', textAlign: 'left'
          }}>
            <span style={{ fontSize: 16, width: 24 }}>{icon}</span>
            <span style={{ fontSize: 12, color: '#1C1C1E', flex: 1 }}>{label}</span>
            <span style={{ color: '#9CA3AF', fontSize: 14 }}>›</span>
          </button>
        ))}

        {user && !user.google_id && (
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #F3F4F6', padding: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
              {lang === 'ru' ? 'Привязать Google аккаунт' : lang === 'en' ? 'Link Google Account' : 'Google akkauntni ulash'}
            </div>
            <button onClick={loginWithGoogle} style={{
              width: '100%', padding: '10px 14px', background: '#fff', color: '#3c4043',
              border: '1.5px solid #dadce0', borderRadius: 8, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google bilan ulash
            </button>
            {googleError && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 6 }}>{googleError}</div>}
          </div>
        )}

        {!user && (
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #F3F4F6', padding: 16, marginBottom: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
              {lang === 'ru' ? 'Войдите через Google' : lang === 'en' ? 'Sign in with Google' : 'Google orqali kiring'}
            </div>
            <button onClick={loginWithGoogle} style={{
              width: '100%', padding: '11px 14px', background: '#fff', color: '#3c4043',
              border: '1.5px solid #dadce0', borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google bilan kirish
            </button>
          </div>
        )}

        {user && (
          <button onClick={logout} style={{
            width: '100%', padding: 12, marginTop: 4, background: '#fee2e2',
            color: '#dc2626', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 500, cursor: 'pointer'
          }}>
            🚪 {lang === 'ru' ? 'Выйти' : lang === 'en' ? 'Logout' : 'Chiqish'}
          </button>
        )}
      </div>
    </div>
  )
}

