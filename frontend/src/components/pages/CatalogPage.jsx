import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { productAPI, cartAPI, aiAPI } from '../../services/api'
import { useStore } from '../../store/store'
import { SkeletonGridCard } from '../common/SkeletonCard'

const MEDIA_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')
const LIMIT = 20

function fixImg(url) {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return MEDIA_BASE + url
}

// ── Logo ───────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #C9956C, #A07050)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1 }}>M</span>
      </div>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 700, color: '#C9956C', letterSpacing: 1.5 }}>MIXART</div>
        <div style={{ fontSize: 7, fontWeight: 500, color: '#9CA3AF', letterSpacing: 3.5, textTransform: 'uppercase' }}>FASHION</div>
      </div>
    </div>
  )
}

// ── Rose-gold placeholder ──────────────────────────────────────────────────────
function RoseGoldImg({ name }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'absolute', inset: 0,
      background: 'linear-gradient(150deg, #F5EDE8 0%, #DCAA80 60%, #C9956C 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M12 3c1.1 0 2 .9 2 2" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 5L3 11h18L12 5z" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.65)" strokeWidth="1.2" strokeLinejoin="round"/>
        <rect x="3" y="11" width="18" height="9" rx="1" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.65)" strokeWidth="1.2"/>
      </svg>
      {name && (
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,.9)', fontWeight: 600, textAlign: 'center', padding: '0 10px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {name}
        </span>
      )}
    </div>
  )
}

// ── Product grid card ─────────────────────────────────────────────────────────
function ProductGridCard({ product, onClick }) {
  const { user, cartCount, setCartCount, favoriteIds, addFavoriteId, removeFavoriteId } = useStore()
  const [adding, setAdding] = useState(false)
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

  async function addToCart(e) {
    e.stopPropagation()
    const hasSizes  = product.sizes?.length  > 0
    const hasColors = product.colors?.length > 0
    if (hasSizes || hasColors) { onClick(); return }
    if (!user?.id) { toast.error("Kiring yoki ro'yxatdan o'ting"); return }
    setAdding(true)
    try {
      await cartAPI.add(user.id, { product_id: product.id, quantity: 1 })
      setCartCount(cartCount + 1)
      toast.success("Savatchaga qo'shildi! 🛍️")
    } catch { toast.error("Savatga qo'shishda xato") }
    finally { setAdding(false) }
  }

  const discount = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : null

  return (
    <div onClick={onClick} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}>
      <div style={{ position: 'relative', height: 210, background: '#F3F4F6', overflow: 'hidden' }}>
        {img
          ? <img src={img} alt={product.name_uz} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <RoseGoldImg name={product.name_uz} />
        }
        {/* Badges */}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {product.is_new_arrival && (
            <span style={{ background: '#16a34a', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>Yangi</span>
          )}
          {discount && (
            <span style={{ background: '#C9956C', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>-{discount}%</span>
          )}
        </div>
        {/* Heart */}
        <button onClick={toggleFav} style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? '#C9956C' : 'none'} stroke={isFav ? '#C9956C' : '#9CA3AF'} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: '10px 10px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.name_uz || product.name_ru}
        </div>
        {product.name_ru && (
          <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {product.name_ru}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#C9956C' }}>
            {product.price ? Math.round(Number(product.price)).toLocaleString('ru-RU') : '0'} so'm
          </span>
          {product.old_price && (
            <span style={{ fontSize: 10, color: '#9CA3AF', textDecoration: 'line-through' }}>
              {Math.round(Number(product.old_price)).toLocaleString('ru-RU')} so'm
            </span>
          )}
        </div>
        {product.rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
            <span style={{ color: '#F59E0B', fontSize: 10 }}>{'★'.repeat(Math.min(5, Math.round(product.rating || 0)))}</span>
            <span style={{ fontSize: 9, color: '#6B7280' }}>{(product.rating || 0).toFixed(1)} ({product.reviews_count || 0})</span>
          </div>
        )}
        <button
          onClick={addToCart}
          disabled={adding}
          style={{ marginTop: 8, width: '100%', height: 36, background: adding ? '#9CA3AF' : '#1C1C1E', color: adding ? '#fff' : '#C9956C', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'opacity .15s' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          {adding ? 'Qo\'shilmoqda...' : 'Savatchaga qo\'shish'}
        </button>
      </div>
    </div>
  )
}

export default function CatalogPage() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [products, setProducts] = useState([])
  const [cats, setCats]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch]     = useState('')
  const [selCat, setSelCat]     = useState(params.get('category') || '')
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [micActive, setMicActive] = useState(false)
  const searchTimer  = useRef()
  const micRecorderRef = useRef()
  const micChunksRef   = useRef([])
  const loaderRef = useRef()

  useEffect(() => {
    productAPI.categories().then(setCats).catch(() => {})
  }, [])

  useEffect(() => {
    loadProducts(1, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selCat])

  function buildParams(pg) {
    const p = { limit: LIMIT, skip: (pg - 1) * LIMIT }
    if (selCat)                    p.category_id    = selCat
    if (search)                    p.search         = search
    if (params.get('trending'))    p.is_trending    = true
    if (params.get('new'))         p.is_new_arrival = true
    return p
  }

  function loadProducts(pg, reset = false) {
    if (reset) { setLoading(true); setPage(1) }
    else setLoadingMore(true)
    productAPI.list(buildParams(pg))
      .then(r => {
        const items = r.items || []
        setTotal(r.total || 0)
        setProducts(prev => reset ? items : [...prev, ...items])
        setPage(pg)
      })
      .catch(() => { if (reset) setProducts([]) })
      .finally(() => { setLoading(false); setLoadingMore(false) })
  }

  function handleSearch(q) {
    setSearch(q)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setLoading(true)
      setPage(1)
      const p = { limit: LIMIT, skip: 0, search: q }
      if (selCat) p.category_id = selCat
      productAPI.list(p)
        .then(r => { setProducts(r.items || []); setTotal(r.total || 0) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 500)
  }

  // Infinite scroll
  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading && !loadingMore && products.length < total) {
        loadProducts(page + 1, false)
      }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  })

  async function toggleMic() {
    if (micActive) { micRecorderRef.current?.stop(); setMicActive(false); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = e => { if (e.data.size > 0) micChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(micChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const fd = new FormData(); fd.append('file', blob, 'voice.webm')
        try { const res = await aiAPI.transcribe(fd); if (res.text) handleSearch(res.text) } catch {}
      }
      recorder.start(); micRecorderRef.current = recorder; setMicActive(true)
    } catch { alert('Mikrofon ruxsati kerak') }
  }

  const pageTitle = params.get('trending') ? '🔥 Trending' : params.get('new') ? '✨ Yangilar' : 'Mahsulotlar'

  return (
    <div style={{ background: '#F8F8F8', minHeight: '100vh' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ background: '#1C1C1E', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 10 }}>
        <Logo />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '7px 10px', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Mahsulot qidirish... / Поиск..."
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 12, outline: 'none' }}
          />
          {search && (
            <button onClick={() => { setSearch(''); loadProducts(1, true) }} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
          )}
        </div>
        <button
          onClick={toggleMic}
          style={{ width: 34, height: 34, borderRadius: 8, background: micActive ? '#EF4444' : 'rgba(201,149,108,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={micActive ? '#fff' : '#C9956C'} strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="11" rx="3"/>
            <path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        </button>
      </div>

      {/* ── Category circles ──────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', gap: 10, padding: '10px 14px', width: 'max-content' }}>
          {[{ id: '', name_uz: 'Hammasi' }, ...cats].map(c => {
            const active = selCat === (c.id ? String(c.id) : '')
            const imgSrc = fixImg(c.image)
            return (
              <button key={c.id || 'all'} onClick={() => setSelCat(c.id ? String(c.id) : '')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px' }}
              >
                <div style={{ width: 52, height: 52, borderRadius: '50%', border: active ? '2.5px solid #C9956C' : '2px solid #E5E7EB', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? '#FDF6F0' : '#F9FAFB', transition: 'all .2s' }}>
                  {imgSrc
                    ? <img src={imgSrc} alt={c.name_uz} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 20 }}>{c.id ? '📦' : '🛍️'}</span>
                  }
                </div>
                <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? '#C9956C' : '#374151', whiteSpace: 'nowrap', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                  {c.name_uz}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Count bar ─────────────────────────────────────────────────────── */}
      {!loading && total > 0 && (
        <div style={{ padding: '8px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{total} ta mahsulot topildi</span>
          {(selCat || search) && (
            <button onClick={() => { setSelCat(''); setSearch(''); loadProducts(1, true) }} style={{ fontSize: 10, color: '#C9956C', background: 'none', border: 'none', cursor: 'pointer' }}>
              Filterni tozalash ✕
            </button>
          )}
        </div>
      )}

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 12px 16px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[0,1,2,3].map(i => <SkeletonGridCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ color: '#6B7280', fontSize: 13 }}>Mahsulot topilmadi</div>
            <button onClick={() => { setSearch(''); setSelCat(''); loadProducts(1, true) }} style={{ marginTop: 12, background: '#C9956C', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, cursor: 'pointer' }}>
              Barchasini ko'rish
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {products.map(p => (
              <ProductGridCard key={p.id} product={p} onClick={() => nav(`/product/${p.id}`)} />
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={loaderRef} style={{ height: 1 }} />
        {loadingMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', gap: 6 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9956C', opacity: 0.6, animation: `pulse ${0.9 + i * 0.15}s ease-in-out infinite` }} />
            ))}
          </div>
        )}
        {!loading && !loadingMore && products.length > 0 && products.length >= total && total > LIMIT && (
          <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: '#9CA3AF' }}>
            Barcha {total} ta mahsulot ko'rsatildi
          </div>
        )}
      </div>
    </div>
  )
}
