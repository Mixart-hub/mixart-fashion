import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { productAPI, aiAPI } from '../../services/api'
import { SkeletonGridCard, PlaceholderGridCard } from '../common/SkeletonCard'

const MEDIA_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')

export default function CatalogPage() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [products, setProducts] = useState([])
  const [cats, setCats]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [search, setSearch]     = useState('')
  const [selCat, setSelCat]     = useState(params.get('category') || '')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [micActive, setMicActive] = useState(false)
  const searchTimer  = useRef()
  const micRecorderRef = useRef()
  const micChunksRef   = useRef([])
  const LIMIT = 20

  useEffect(() => {
    productAPI.categories().then(setCats).catch(() => {})
  }, [])

  useEffect(() => {
    loadProducts(1)
  }, [selCat])

  function loadProducts(pg) {
    setLoading(true)
    setError(false)
    const p = { limit: LIMIT, skip: (pg - 1) * LIMIT }
    if (selCat)              p.category_id    = selCat
    if (search)              p.search         = search
    if (params.get('trending')) p.is_trending = true
    if (params.get('new'))      p.is_new_arrival = true
    productAPI.list(p)
      .then(r => { setProducts(r.items || []); setTotal(r.total || 0) })
      .catch(() => { setError(true); setProducts([]) })
      .finally(() => setLoading(false))
    setPage(pg)
  }

  function handleSearch(q) {
    setSearch(q)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => loadProducts(1), 500)
  }

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
        const fd = new FormData()
        fd.append('file', blob, 'voice.webm')
        try { const res = await aiAPI.transcribe(fd); if (res.text) handleSearch(res.text) } catch {}
      }
      recorder.start(); micRecorderRef.current = recorder; setMicActive(true)
    } catch { alert('Mikrofon ruxsati kerak') }
  }

  return (
    <div style={{ background: '#F8F8F8', minHeight: '100vh' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#1C1C1E', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontFamily: 'Playfair Display, serif', color: '#C9956C', fontSize: 15, fontWeight: 700, letterSpacing: 1.5 }}>Mahsulotlar</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '7px 12px', gap: 8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Mahsulot qidirish..."
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 13, outline: 'none' }}
          />
        </div>
        <button
          onClick={toggleMic}
          style={{ width: 34, height: 34, borderRadius: 8, background: micActive ? '#EF4444' : 'rgba(201,149,108,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}
        >{micActive ? '⏹' : '🎤'}</button>
      </div>

      {/* ── Category circles ────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', gap: 12, padding: '12px 16px', width: 'max-content' }}>
          {[{ id: '', name_uz: 'Hammasi', emoji: '🛍️' }, ...cats].map(c => {
            const active = selCat === (c.id ? String(c.id) : '')
            const imgSrc = c.image
              ? (c.image.startsWith('http') ? c.image : `${MEDIA_BASE}${c.image}`)
              : null
            return (
              <button
                key={c.id || 'all'}
                onClick={() => setSelCat(c.id ? String(c.id) : '')}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                  padding: '4px 2px',
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  border: active ? '2.5px solid #C9956C' : '2px solid #E5E7EB',
                  overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? '#FDF6F0' : '#F9FAFB',
                  transition: 'all .2s',
                }}>
                  {imgSrc ? (
                    <img src={imgSrc} alt={c.name_uz} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 22 }}>{c.emoji || '📦'}</span>
                  )}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: active ? 700 : 500,
                  color: active ? '#C9956C' : '#374151',
                  whiteSpace: 'nowrap', maxWidth: 64,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  textAlign: 'center',
                }}>{c.name_uz}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Products grid ───────────────────────────────────────────────── */}
      <div style={{ padding: 16 }}>
        {loading ? (
          /* Skeleton loading state */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[0, 1, 2, 3].map(i => <SkeletonGridCard key={i} />)}
          </div>
        ) : error ? (
          /* API failure — show 3 placeholder cards, no blank section */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: '#FEF3C7', borderRadius: 10 }}>
              <span>⚠️</span>
              <span style={{ fontSize: 12, color: '#92400E' }}>Internet ulanishi yo'q. Namuna ma'lumotlar ko'rsatilmoqda.</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <PlaceholderGridCard index={0} />
              <PlaceholderGridCard index={1} />
              <PlaceholderGridCard index={2} />
            </div>
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ color: '#6B7280', fontSize: 14 }}>Mahsulot topilmadi</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {products.map(p => <ProductGridCard key={p.id} product={p} onClick={() => nav(`/product/${p.id}`)} />)}
          </div>
        )}

        {!loading && !error && total > LIMIT && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            {page > 1            && <PageBtn label="← Oldingi" onClick={() => loadProducts(page - 1)} outline />}
            {page * LIMIT < total && <PageBtn label="Keyingi →" onClick={() => loadProducts(page + 1)} />}
          </div>
        )}
      </div>
    </div>
  )
}

function ProductGridCard({ product, onClick }) {
  const [fav, setFav] = useState(false)
  const rawImg = product.images?.[0]
  const img = rawImg ? (rawImg.startsWith('http') ? rawImg : `${MEDIA_BASE}${rawImg}`) : null

  return (
    <div onClick={onClick} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}>
      <div style={{ position: 'relative', height: 200, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {img
          ? <img src={img} alt={product.name_uz} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 48 }}>👗</span>
        }
        <button
          onClick={e => { e.stopPropagation(); setFav(!fav) }}
          style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill={fav ? '#C9956C' : 'none'} stroke={fav ? '#C9956C' : '#9CA3AF'} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </button>
        {product.is_new_arrival ? (
          <span style={{ position: 'absolute', top: 10, left: 10, background: '#16a34a', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>Yangi</span>
        ) : null}
        {product.old_price ? (
          <span style={{ position: 'absolute', top: product.is_new_arrival ? 30 : 10, left: 10, background: '#C9956C', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
            -{Math.round((1 - product.price / product.old_price) * 100)}%
          </span>
        ) : null}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.name_uz || product.name_ru}
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.name_ru}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#C9956C', marginTop: 6 }}>
          {product.price ? Math.round(Number(product.price)).toLocaleString('ru-RU') : '0'} so'm
        </div>
        {product.old_price ? (
          <div style={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'line-through' }}>
            {Math.round(Number(product.old_price)).toLocaleString('ru-RU')} so'm
          </div>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <span style={{ color: '#F59E0B', fontSize: 11 }}>{'★'.repeat(Math.round(product.rating || 4))}</span>
          <span style={{ fontSize: 10, color: '#6B7280' }}>{product.rating?.toFixed(1) || '4.8'} ({product.reviews_count || 0})</span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClick() }}
          style={{ marginTop: 8, width: '100%', height: 38, background: '#1C1C1E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          Savatchaga qo'shish
        </button>
      </div>
    </div>
  )
}

function PageBtn({ label, onClick, outline }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 20px', borderRadius: 8, border: outline ? '1px solid #E5E7EB' : 'none', background: outline ? '#fff' : '#C9956C', color: outline ? '#374151' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
      {label}
    </button>
  )
}
