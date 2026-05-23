import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { productAPI, cartAPI } from '../../services/api'
import { useStore } from '../../store/store'
import { SkeletonMiniCard } from '../common/SkeletonCard'
import useSSE from '../../hooks/useSSE'
import toast from 'react-hot-toast'

const API_BASE  = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const MEDIA_BASE = API_BASE.replace('/api', '')

function fixImg(url) {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return MEDIA_BASE + url
}

// ── Logo component ────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'linear-gradient(135deg, #C9956C, #A07050)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1.5px solid rgba(255,255,255,0.15)',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1 }}>M</span>
      </div>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 700, color: '#C9956C', letterSpacing: 2 }}>MIXART</div>
        <div style={{ fontSize: 8, fontWeight: 500, color: '#9CA3AF', letterSpacing: 4, textTransform: 'uppercase' }}>FASHION</div>
      </div>
    </div>
  )
}

// ── Rose-gold placeholder ─────────────────────────────────────────────────────
function RoseGoldImg({ name, style }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'absolute', inset: 0,
      background: 'linear-gradient(150deg, #F5EDE8 0%, #DCAA80 60%, #C9956C 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 6, ...style,
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M12 3c1.1 0 2 .9 2 2" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 5L3 11h18L12 5z" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.65)" strokeWidth="1.2" strokeLinejoin="round"/>
        <rect x="3" y="11" width="18" height="9" rx="1" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.65)" strokeWidth="1.2"/>
      </svg>
      {name && (
        <span style={{
          fontSize: 9, color: 'rgba(255,255,255,.9)', fontWeight: 600,
          textAlign: 'center', padding: '0 10px', lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{name}</span>
      )}
    </div>
  )
}

// ── Banner carousel ───────────────────────────────────────────────────────────
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
  const imgSrc = fixImg(cur.image)

  return (
    <div style={{ margin: '12px 16px 0', position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
      <div
        onClick={() => cur.link && nav(cur.link)}
        style={{ height: 160, background: '#E5E7EB', position: 'relative', cursor: cur.link ? 'pointer' : 'default', borderRadius: 16, overflow: 'hidden' }}
      >
        {imgSrc
          ? <img src={imgSrc} alt={cur.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#C9956C,#A0785A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Logo />
            </div>
        }
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
            <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'width .3s', cursor: 'pointer' }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── MiniCard ──────────────────────────────────────────────────────────────────
function MiniCard({ product, onClick }) {
  const { user, favoriteIds, addFavoriteId, removeFavoriteId } = useStore()
  const isFav = favoriteIds.includes(product.id)
  const img = fixImg(product.images?.[0])

  async function toggleFav(e) {
    e.stopPropagation()
    if (!user?.id) { toast.error("Sevimlilar uchun kiring"); return }
    try {
      const res = await productAPI.toggleFavorite(product.id, user.id)
      if (res?.favorited) { addFavoriteId(product.id); toast.success('Sevimlilariga qo\'shildi ❤️') }
      else                { removeFavoriteId(product.id); toast('Sevimlilardan olib tashlandi') }
    } catch { toast.error('Xato yuz berdi') }
  }

  return (
    <div
      onClick={onClick}
      style={{ width: 140, flexShrink: 0, borderRadius: 16, overflow: 'hidden', background: '#fff', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', position: 'relative' }}
    >
      <div style={{ height: 175, background: '#F3F4F6', position: 'relative', overflow: 'hidden' }}>
        {img
          ? <img src={img} alt={product.name_uz} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <RoseGoldImg name={product.name_uz} />
        }
        {product.is_new_arrival && (
          <span style={{ position: 'absolute', top: 8, left: 8, background: '#16a34a', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>Yangi</span>
        )}
        <button
          onClick={toggleFav}
          style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill={isFav ? '#C9956C' : 'none'} stroke={isFav ? '#C9956C' : '#9CA3AF'} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </button>
      </div>
      <div style={{ padding: '10px 10px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.name_uz || product.name_ru}
        </div>
        {product.name_ru && (
          <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {product.name_ru}
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#C9956C', marginTop: 5 }}>
          {product.price ? Math.round(Number(product.price)).toLocaleString('ru-RU') : '0'} so'm
        </div>
        {product.old_price && (
          <div style={{ fontSize: 10, color: '#9CA3AF', textDecoration: 'line-through', marginTop: 1 }}>
            {Math.round(Number(product.old_price)).toLocaleString('ru-RU')} so'm
          </div>
        )}
      </div>
    </div>
  )
}

const QUICK_ACTIONS = [
  { icon: '🛍️', label: 'Katalog',     sub: 'Browse Products', path: '/catalog'   },
  { icon: '📦', label: 'Buyurtmalar', sub: 'My Orders',       path: '/orders'    },
  { icon: '📍', label: 'Filiallar',   sub: 'Track Order',     path: '/branches'  },
  { icon: '❤️', label: 'Sevimlilar', sub: 'Favorites',       path: '/favorites' },
  { icon: '📰', label: 'Yangiliklar', sub: 'News',           path: '/news'      },
  { icon: '✨', label: 'AI Stilist',  sub: 'Style AI',        path: '/ai'        },
]

export default function HomePage() {
  const nav = useNavigate()
  const { user, lang } = useStore()
  const [trending, setTrending]   = useState([])
  const [newArrivals, setNewArrivals] = useState([])
  const [loading, setLoading]     = useState(true)
  const [banners, setBanners]     = useState([])
  const [unread, setUnread]       = useState(0)

  const loadTrending = useCallback(() => {
    productAPI.trending()
      .then(d => setTrending(d || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadTrending() }, [loadTrending])

  useEffect(() => {
    productAPI.list({ is_new_arrival: true, limit: 6 })
      .then(r => setNewArrivals(r.items || []))
      .catch(() => {})
  }, [])

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

  useSSE({ product_changed: () => loadTrending() })

  const greeting = lang === 'ru' ? 'Salom! 👋' : 'Salom! 👋'

  return (
    <div style={{ background: '#F8F8F8', minHeight: '100vh', paddingBottom: 80 }}>

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div style={{ background: '#1C1C1E', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 20 }}>
        <Logo />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => nav('/catalog')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
          <button onClick={() => nav('/notifications')} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {unread > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, background: '#EF4444', border: '1.5px solid #1C1C1E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700, padding: '0 3px' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── BANNER ──────────────────────────────────────────────────────────── */}
      {banners.length > 0 ? (
        <BannerCarousel banners={banners} />
      ) : (
        <div style={{ margin: '12px 16px 0', background: 'linear-gradient(135deg,#1C1C1E,#B87333)', borderRadius: 16, padding: '20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.85)', lineHeight: 1.3 }}>{greeting}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 4, lineHeight: 1.3 }}>Mixart Fashion</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>Moda dunyosiga xush kelibsiz</div>
            <button onClick={() => nav('/catalog')} style={{ marginTop: 12, background: '#C9956C', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Xarid qilish →
            </button>
          </div>
          <div style={{ opacity: 0.9 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M12 3c1.1 0 2 .9 2 2" stroke="rgba(201,149,108,.8)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 5L2 12h20L12 5z" fill="rgba(201,149,108,.2)" stroke="rgba(201,149,108,.7)" strokeWidth="1.2" strokeLinejoin="round"/>
              <rect x="2" y="12" width="20" height="10" rx="1.5" fill="rgba(201,149,108,.12)" stroke="rgba(201,149,108,.7)" strokeWidth="1.2"/>
            </svg>
          </div>
        </div>
      )}

      {/* ── QUICK ACTIONS ───────────────────────────────────────────────────── */}
      <div style={{ margin: '14px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {QUICK_ACTIONS.map(a => (
            <button key={a.label} onClick={() => nav(a.path)} style={{ background: '#fff', border: 'none', borderRadius: 14, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#F5EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>{a.icon}</div>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#1C1C1E', textAlign: 'center' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── TRENDING ────────────────────────────────────────────────────────── */}
      <div style={{ margin: '20px 0 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 10px' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>🔥 Trenddagi mahsulotlar</span>
          <button onClick={() => nav('/catalog?trending=true')} style={{ fontSize: 12, color: '#C9956C', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Barchasini &gt;
          </button>
        </div>
        <div style={{ display: 'flex', gap: 12, padding: '0 16px 4px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {loading
            ? [0,1,2].map(i => <SkeletonMiniCard key={i} />)
            : trending.length === 0
              ? <div style={{ fontSize: 12, color: '#9CA3AF', padding: '20px 0' }}>Hozircha mavjud emas</div>
              : trending.slice(0, 8).map(p => (
                  <MiniCard key={p.id} product={p} onClick={() => nav(`/product/${p.id}`)} />
                ))
          }
        </div>
      </div>

      {/* ── NEW ARRIVALS ─────────────────────────────────────────────────────── */}
      {newArrivals.length > 0 && (
        <div style={{ margin: '20px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 10px' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>✨ Yangi mahsulotlar</span>
            <button onClick={() => nav('/catalog?new=true')} style={{ fontSize: 12, color: '#C9956C', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Barchasini &gt;
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, padding: '0 16px 4px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {newArrivals.map(p => (
              <MiniCard key={p.id} product={p} onClick={() => nav(`/product/${p.id}`)} />
            ))}
          </div>
        </div>
      )}

      {/* ── BOTTOM CTA ───────────────────────────────────────────────────────── */}
      <div style={{ margin: '20px 16px 0', background: 'linear-gradient(135deg,#F5EDE8,#EDD5C4)', borderRadius: 16, padding: '18px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E' }}>Barcha kollekciyalar</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>Erkak, ayol, bolalar kiyimlari</div>
        </div>
        <button onClick={() => nav('/catalog')} style={{ background: '#1C1C1E', color: '#C9956C', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Ko'rish →
        </button>
      </div>

    </div>
  )
}
