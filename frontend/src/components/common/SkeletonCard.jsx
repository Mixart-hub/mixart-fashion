import React from 'react'

// ── Skeleton variants (loading state) ──────────────────────────────────────

export function SkeletonMiniCard() {
  return (
    <div style={{ width: 130, flexShrink: 0, borderRadius: 16, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div className="skeleton" style={{ height: 160, borderRadius: 0 }} />
      <div style={{ padding: '10px 10px 14px' }}>
        <div className="skeleton" style={{ height: 12, borderRadius: 4, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 13, width: '60%', borderRadius: 4 }} />
      </div>
    </div>
  )
}

export function SkeletonGridCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div className="skeleton" style={{ height: 200 }} />
      <div style={{ padding: 12 }}>
        <div className="skeleton" style={{ height: 13, borderRadius: 4, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 11, width: '70%', borderRadius: 4, marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 15, width: '50%', borderRadius: 4, marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 38, borderRadius: 8 }} />
      </div>
    </div>
  )
}

// ── Placeholder variants (API error fallback) ──────────────────────────────

const PLACEHOLDER_MINI = [
  { name: 'Rose Gold Blazer', price: 650000, emoji: '🧥' },
  { name: 'Linen Ko\'ylak', price: 299000, emoji: '👗' },
  { name: 'Evening Dress', price: 580000, emoji: '✨' },
]

export function PlaceholderMiniCard({ index = 0 }) {
  const p = PLACEHOLDER_MINI[index % PLACEHOLDER_MINI.length]
  return (
    <div style={{ width: 140, flexShrink: 0, borderRadius: 16, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', opacity: 0.75, cursor: 'default' }}>
      <div style={{ height: 175, background: 'linear-gradient(150deg,#F5EDE8 0%,#DCAA80 60%,#C9956C 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M12 3c1.1 0 2 .9 2 2" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M12 5L3 11h18L12 5z" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.65)" strokeWidth="1.2" strokeLinejoin="round"/>
          <rect x="3" y="11" width="18" height="9" rx="1" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.65)" strokeWidth="1.2"/>
        </svg>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,.9)', fontWeight: 600, textAlign: 'center', padding: '0 10px' }}>{p.name}</span>
      </div>
      <div style={{ padding: '10px 10px 14px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#C9956C', marginTop: 4 }}>{p.price.toLocaleString()} so'm</div>
      </div>
    </div>
  )
}

const PLACEHOLDER_GRID = [
  { name: 'Rose Gold Blazer', nameRu: 'Блейзер розовое золото', price: 650000, oldPrice: 780000, rating: 4.8, reviews: 24, emoji: '🧥' },
  { name: 'Linen Oversize Ko\'ylak', nameRu: 'Льняная рубашка оверсайз', price: 299000, oldPrice: null, rating: 4.6, reviews: 18, emoji: '👗' },
  { name: 'Evening Satin Dress', nameRu: 'Вечернее атласное платье', price: 580000, oldPrice: null, rating: 4.9, reviews: 31, emoji: '✨' },
]

export function PlaceholderGridCard({ index = 0 }) {
  const p = PLACEHOLDER_GRID[index % PLACEHOLDER_GRID.length]
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : null

  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', opacity: 0.78, cursor: 'default' }}>
      <div style={{ position: 'relative', height: 210, background: 'linear-gradient(150deg,#F5EDE8 0%,#DCAA80 60%,#C9956C 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M12 3c1.1 0 2 .9 2 2" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M12 5L3 11h18L12 5z" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.65)" strokeWidth="1.2" strokeLinejoin="round"/>
          <rect x="3" y="11" width="18" height="9" rx="1" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.65)" strokeWidth="1.2"/>
        </svg>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.9)', fontWeight: 600, textAlign: 'center', padding: '0 12px' }}>{p.name}</span>
        {discount && (
          <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
            -{discount}%
          </span>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p.name}
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p.nameRu}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#C9956C', marginTop: 6 }}>
          {p.price.toLocaleString()} so'm
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <span style={{ color: '#F59E0B', fontSize: 11 }}>{'★'.repeat(Math.round(p.rating))}</span>
          <span style={{ fontSize: 10, color: '#6B7280' }}>{p.rating} ({p.reviews})</span>
        </div>
        <button
          disabled
          style={{ marginTop: 8, width: '100%', height: 38, background: '#D1D5DB', color: '#9CA3AF', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          Yuklanmoqda...
        </button>
      </div>
    </div>
  )
}
