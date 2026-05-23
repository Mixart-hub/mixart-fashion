import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../store/store'

const SVG = {
  home: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  catalog: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg>,
  cart: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  favorites: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  profile: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
}

const LABELS = {
  uz: ['Bosh sahifa', 'Katalog', 'Savatcha', 'Sevimlilar', 'Profil'],
  ru: ['Главная', 'Каталог', 'Корзина', 'Избранное', 'Профиль'],
  en: ['Home', 'Catalog', 'Cart', 'Favorites', 'Profile'],
}

const tabs = [
  { path: '/', key: 'home' },
  { path: '/catalog', key: 'catalog' },
  { path: '/cart', key: 'cart', badge: true },
  { path: '/favorites', key: 'favorites' },
  { path: '/profile', key: 'profile' },
]

export default function BottomNav() {
  const nav = useNavigate()
  const loc = useLocation()
  const { cartCount, lang } = useStore()
  const labels = LABELS[lang] || LABELS.uz

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto',
      background: '#1C1C1E',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      zIndex: 100,
      height: 72,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map((t, i) => {
        const active = t.path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(t.path)
        return (
          <button
            key={t.path}
            onClick={() => nav(t.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              position: 'relative',
              color: active ? '#C9956C' : '#6B7280',
              transition: 'color .15s',
              padding: '8px 0',
            }}
          >
            <div style={{ position: 'relative' }}>
              {SVG[t.key]}
              {t.badge && cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -7,
                  background: '#EF4444', color: '#fff', borderRadius: '50%',
                  width: 16, height: 16, fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid #1C1C1E',
                }}>{cartCount > 9 ? '9+' : cartCount}</span>
              )}
            </div>
            <span style={{ fontSize: 9, fontWeight: active ? 600 : 400, lineHeight: 1 }}>
              {labels[i]}
            </span>
            {active && (
              <div style={{
                position: 'absolute', bottom: 4, width: 4, height: 4,
                background: '#C9956C', borderRadius: '50%',
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
