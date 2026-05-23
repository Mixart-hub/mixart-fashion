import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { productAPI } from '../../services/api'
import { useStore } from '../../store/store'
import { SkeletonMiniCard, PlaceholderMiniCard } from '../common/SkeletonCard'
import useSSE from '../../hooks/useSSE'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const MEDIA_BASE = API_BASE.replace('/api', '')

const QUICK_ACTIONS = [
  { icon: '🛍️', label: 'Ko\'rish',    sub: 'Browse Products', path: '/catalog'   },
  { icon: '📦', label: 'Buyurtmalar', sub: 'My Orders',       path: '/orders'    },
  { icon: '📍', label: 'Joylashuv',  sub: 'Track Order',     path: '/branches'  },
  { icon: '❤️', label: 'Sevimlilar', sub: 'Favorites',       path: '/favorites' },
  { icon: '📰', label: 'Yangiliklar', sub: 'News',           path: '/news'      },
  { icon: '👤', label: 'Profil',     sub: 'Profile',         path: '/profile'   },
]

function BannerCarousel({ banners }) {
  const [idx, setIdx] = useState(0)
  const timerRef = useRef()
  const nav = useNavigate()

  useEffect(() => {
    if (banners.length <= 1) return
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000)
    return () => clearInterval(timerRef.current)
  }, [banners.length])

  if (!banners.length) return null

  const cur = banners[idx]
  const imgSrc = cur.image
    ? (cur.image.startsWith('http') ? cur.image : `${MEDIA_BASE}${cur.image}`)
    : null

  return (
    <div style={{ margin: '12px 16px 0', position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
      <div
        onClick={() => cur.link && nav(cur.link)}
        style={{
          height: 160, background: '#E5E7EB', position: 'relative',
          cursor: cur.link ? 'pointer' : 'default',
          borderRadius: 16, overflow: 'hidden',
        }}
      >
        {imgSrc ? (
          <img src={imgSrc} alt={cur.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#C9956C,#A0785A)' }}>
            <span style={{ fontSize: 40 }}>🛍️</span>
          </div>
        )}
        {(cur.title || cur.subtitle) && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,0.6))', padding: '24px 16px 14px' }}>
            {cur.title && <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{cur.title}</div>}
            {cur.subtitle && <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>{cur.subtitle}</div>}
          </div>
        )}
      </div>
      {banners.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, position: 'absolute', bottom: 8, left: 0, right: 0 }}>
          {banners.map((_, i) => (
            <div
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? 16 : 6, height: 6,
                borderRadius: 3,
                background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)',
                transition: 'width .3s',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const nav = useNavigate()
  const { user, lang } = useStore()
  const [trending, setTrending]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)
  const [currentDot, setCurrentDot] = useState(0)
  const [banners, setBanners]       = useState([])
  const [unread, setUnread]         = useState(0)

  const loadTrending = useCallback(() => {
    productAPI.trending()
      .then(d => { setTrending(d || []); setError(false) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadTrending() }, [loadTrending])

  useEffect(() => {
    fetch(`${API_BASE}/banners`)
      .then(r => r.ok ? r.json() : [])
      .then(d => Array.isArray(d) ? setBanners(d) : setBanners([]))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user?.id) return
    fetch(`${API_BASE}/notifications/unread/${user.id}`)
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(d => setUnread(d.count || 0))
      .catch(() => {})
  }, [user?.id])

  useSSE({
    product_changed: () => loadTrending(),
  })

  const greeting = lang === 'ru' ? 'Привет! 👋' : 'Salom! 👋'
  const welcome  = lang === 'ru'
    ? 'Добро пожаловать\nв Mixart Fashion ✨'
    : 'Xush kelibsiz\nMixart Fashion ga ✨'

  return (
    <div style={{ background: '#F8F8F8', minHeight: '100vh' }}>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div style={{ background: '#1C1C1E', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Playfair Display, serif', color: '#C9956C', fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>
          MIXART FASHION
        </span>
        <button
          onClick={() => nav('/notifications')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 4 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: 0, right: 0,
              minWidth: 16, height: 16, borderRadius: 8,
              background: '#EF4444', border: '1.5px solid #1C1C1E',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: '#fff', fontWeight: 700, padding: '0 3px',
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>

      {/* ── BANNER CAROUSEL ──────────────────────────────────────────────── */}
      {banners.length > 0 ? (
        <BannerCarousel banners={banners} />
      ) : (
        /* fallback welcome card when no banners */
        <div style={{ margin: '16px 16px 0', background: 'linear-gradient(135deg,#FDF6F0,#F5EDE8)', borderRadius: 16, padding: '20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', lineHeight: 1.3 }}>{greeting}</div>
            <div style={{ fontSize: 14, color: '#6B7280', marginTop: 4, whiteSpace: 'pre-line', lineHeight: 1.5 }}>{welcome}</div>
            <button
              onClick={() => nav('/catalog')}
              style={{ marginTop: 12, background: '#C9956C', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Xarid qilish →
            </button>
          </div>
          <div style={{ fontSize: 64, opacity: 0.85 }}>👜</div>
        </div>
      )}

      {/* ── QUICK ACTIONS ────────────────────────────────────────────────── */}
      <div style={{ margin: '16px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {QUICK_ACTIONS.map(a => (
            <button
              key={a.label}
              onClick={() => nav(a.path)}
              style={{ background: '#fff', border: 'none', borderRadius: 16, padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F5EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{a.icon}</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1C1C1E' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── TRENDING SECTION ─────────────────────────────────────────────── */}
      <div style={{ margin: '20px 0 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 10px' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>🔥 Trenddagi mahsulotlar</span>
          <button
            onClick={() => nav('/catalog?trending=true')}
            style={{ fontSize: 12, color: '#C9956C', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            Barchasini ko'rish &gt;
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, padding: '0 16px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {loading ? (
            [0, 1, 2].map(i => <SkeletonMiniCard key={i} />)
          ) : error || trending.length === 0 ? (
            [0, 1, 2].map(i => <PlaceholderMiniCard key={i} index={i} />)
          ) : (
            trending.slice(0, 6).map(p => (
              <MiniCard key={p.id} product={p} onClick={() => nav(`/product/${p.id}`)} />
            ))
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingBottom: 8 }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              onClick={() => setCurrentDot(i)}
              style={{ width: i === currentDot ? 16 : 6, height: 6, borderRadius: 3, background: i === currentDot ? '#C9956C' : '#D1D5DB', transition: 'width .3s', cursor: 'pointer' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniCard({ product, onClick }) {
  const [fav, setFav] = useState(false)
  const rawImg = product.images?.[0]
  const img = rawImg ? (rawImg.startsWith('http') ? rawImg : `${MEDIA_BASE}${rawImg}`) : null

  return (
    <div
      onClick={onClick}
      style={{ width: 130, flexShrink: 0, borderRadius: 16, overflow: 'hidden', background: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', position: 'relative' }}
    >
      <div style={{ height: 160, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {img
          ? <img src={img} alt={product.name_uz} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 40 }}>👗</span>
        }
        <button
          onClick={e => { e.stopPropagation(); setFav(!fav) }}
          style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={fav ? '#C9956C' : 'none'} stroke={fav ? '#C9956C' : '#9CA3AF'} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </button>
      </div>
      <div style={{ padding: '10px 10px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.name_uz || product.name_ru}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#C9956C', marginTop: 4 }}>
          {product.price ? Math.round(Number(product.price)).toLocaleString('ru-RU') : '0'} so'm
        </div>
      </div>
    </div>
  )
}
