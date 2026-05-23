import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { productAPI, cartAPI } from '../../services/api'
import { useStore } from '../../store/store'
import ImageGallery from '../common/ImageGallery'
import CounterButton from '../common/CounterButton'

const MEDIA_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')

function fixUrl(url) {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return MEDIA_BASE + url
}

const fmtSum = p => p ? Math.round(Number(p)).toLocaleString('ru-RU') : '0'

const COLOR_MAP = {
  beige: '#D2B48C', white: '#FFFFFF', black: '#1C1C1E', olive: '#808000',
  blue: '#4169E1', pink: '#FFB6C1', rose: '#C9956C', cream: '#FFFDD0',
  brown: '#8B4513', red: '#DC2626', grey: '#9CA3AF', gray: '#9CA3AF',
  green: '#16A34A', yellow: '#F59E0B', purple: '#7C3AED', navy: '#1E3A5F',
}

// ── Stars component ───────────────────────────────────────────────────────────
function Stars({ rating, size = 14, interactive = false, onRate }) {
  const [hovered, setHovered] = useState(0)
  const show = hovered || rating
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <span
          key={n}
          onClick={interactive ? () => onRate?.(n) : undefined}
          onMouseEnter={interactive ? () => setHovered(n) : undefined}
          onMouseLeave={interactive ? () => setHovered(0) : undefined}
          style={{ fontSize: size, color: n <= show ? '#F59E0B' : '#E5E7EB', cursor: interactive ? 'pointer' : 'default', lineHeight: 1 }}
        >★</span>
      ))}
    </div>
  )
}

// ── Review card ───────────────────────────────────────────────────────────────
function ReviewCard({ review }) {
  const ago = review.created_at
    ? new Date(review.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#C9956C,#B87333)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {(review.full_name || 'A')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{review.full_name || 'Foydalanuvchi'}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF' }}>{ago}</div>
          </div>
        </div>
        <Stars rating={review.rating} size={12} />
      </div>
      {review.comment && (
        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, paddingLeft: 40 }}>{review.comment}</div>
      )}
    </div>
  )
}

export default function ProductPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user, setCartCount, cartCount, favoriteIds, addFavoriteId, removeFavoriteId } = useStore()
  const [data, setData]         = useState(null)
  const [selSize, setSelSize]   = useState('')
  const [selColor, setSelColor] = useState('')
  const [qty, setQty]           = useState(1)
  const [adding, setAdding]     = useState(false)
  const [added, setAdded]       = useState(false)
  const [err, setErr]           = useState('')
  const [descOpen, setDescOpen] = useState(false)

  // Reviews state
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)

  useEffect(() => {
    productAPI.get(id).then(d => {
      setData(d)
      if (d?.product?.sizes?.length === 1) setSelSize(d.product.sizes[0])
      if (d?.product?.colors?.length === 1) setSelColor(d.product.colors[0])
    }).catch(() => nav('/catalog'))
  }, [id])

  if (!data) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#C9956C,#B87333)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 3c1.1 0 2 .9 2 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M12 5L3 11h18L12 5z" fill="rgba(255,255,255,.3)" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/>
          <rect x="3" y="11" width="18" height="9" rx="1" fill="rgba(255,255,255,.15)" stroke="#fff" strokeWidth="1.2"/>
        </svg>
      </div>
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>Yuklanmoqda...</div>
    </div>
  )

  const { product, stocks = [], reviews = [], avg_rating, review_count } = data
  const imgs = product.images?.length > 0 ? product.images.map(fixUrl) : []
  const discount = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : null
  const isFav = favoriteIds.includes(product.id)

  function stockFor(size, color) {
    return stocks.filter(s => s.size === size && s.color === color).reduce((sum, s) => sum + (s.quantity || 0), 0)
  }

  async function toggleFav() {
    if (!user?.id) { toast.error("Sevimlilar uchun kiring"); return }
    try {
      const res = await productAPI.toggleFavorite(product.id, user.id)
      if (res?.favorited) { addFavoriteId(product.id); toast.success('Sevimlilariga qo\'shildi ❤️') }
      else                { removeFavoriteId(product.id); toast('Sevimlilardan olib tashlandi') }
    } catch { toast.error('Xato yuz berdi') }
  }

  async function addToCart() {
    setErr('')
    if (!selSize && product.sizes?.length > 0) { setErr("O'lchamni tanlang"); return }
    if (!selColor && product.colors?.length > 0) { setErr("Rangni tanlang"); return }
    if (!user?.id) { setErr("Iltimos, Telegram orqali kiring"); return }
    const available = (product.sizes?.length > 0 && product.colors?.length > 0)
      ? stockFor(selSize, selColor)
      : stocks.reduce((s, st) => s + st.quantity, 0) || 999
    if (available < qty) { setErr(`Faqat ${available} ta qoldi`); return }
    setAdding(true)
    try {
      await cartAPI.add(user.id, { product_id: product.id, size: selSize, color: selColor, quantity: qty })
      setCartCount(cartCount + qty)
      setAdded(true)
      toast.success("Savatchaga qo'shildi! 🛍️")
      setTimeout(() => setAdded(false), 2500)
    } catch (e) {
      toast.error(e?.detail || "Savatga qo'shishda xato")
      setErr(e?.detail || "Savatga qo'shishda xato")
    } finally { setAdding(false) }
  }

  async function submitReview() {
    if (!user?.id) { toast.error("Sharh qoldirish uchun kiring"); return }
    if (!reviewRating) { toast.error("Baho bering"); return }
    setSubmitting(true)
    try {
      await productAPI.addReview(product.id, user.id, reviewRating, reviewComment.trim() || null)
      toast.success("Sharhingiz qabul qilindi!")
      // Reload product to get updated reviews
      const fresh = await productAPI.get(id)
      setData(fresh)
      setReviewRating(0); setReviewComment(''); setShowReviewForm(false)
    } catch { toast.error("Sharh qo'shishda xato") }
    finally { setSubmitting(false) }
  }

  return (
    <div style={{ background: '#F8F8F8', paddingBottom: 100 }}>
      {/* Floating buttons */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', zIndex: 20, display: 'flex', justifyContent: 'space-between', padding: '12px 16px', pointerEvents: 'none' }}>
        <button onClick={() => nav(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(28,28,30,0.85)', border: 'none', cursor: 'pointer', pointerEvents: 'all', boxShadow: '0 2px 8px rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'all' }}>
          <button onClick={toggleFav} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(28,28,30,0.85)', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isFav ? '#C9956C' : 'none'} stroke={isFav ? '#C9956C' : '#fff'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          </button>
          <button
            onClick={async () => {
              const url = window.location.href
              const text = `${product.name_uz} — ${fmtSum(product.price)} so'm`
              if (navigator.share) {
                navigator.share({ title: product.name_uz, text, url }).catch(() => {})
              } else {
                await navigator.clipboard.writeText(url).catch(() => {})
                toast.success("Havola nusxalandi!")
              }
            }}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(28,28,30,0.85)', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>

      {/* Image gallery */}
      <div style={{ position: 'relative' }}>
        {imgs.length > 0
          ? <ImageGallery images={imgs} height={340} placeholder={null} />
          : (
            <div style={{ height: 340, background: 'linear-gradient(150deg, #F5EDE8, #DCAA80, #C9956C)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                <path d="M12 3c1.1 0 2 .9 2 2" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M12 5L3 11h18L12 5z" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.65)" strokeWidth="1.2" strokeLinejoin="round"/>
                <rect x="3" y="11" width="18" height="9" rx="1" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.65)" strokeWidth="1.2"/>
              </svg>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', fontWeight: 600 }}>{product.name_uz}</span>
            </div>
          )
        }
        {discount && (
          <span style={{ position: 'absolute', bottom: 12, left: 12, background: '#C9956C', color: '#fff', fontSize: 12, padding: '4px 10px', borderRadius: 8, fontWeight: 700, zIndex: 1 }}>
            −{discount}%
          </span>
        )}
      </div>

      {/* Product info card */}
      <div style={{ background: '#fff', padding: '20px 16px 16px', borderRadius: '20px 20px 0 0', marginTop: -16, position: 'relative', zIndex: 1 }}>

        {/* Name & rating */}
        <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', lineHeight: 1.3, marginBottom: 4 }}>
          {product.name_uz}
        </div>
        {product.name_ru && (
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>{product.name_ru}</div>
        )}

        {/* Price & rating row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#C9956C' }}>{fmtSum(product.price)} so'm</span>
            {product.old_price && (
              <span style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'line-through', marginLeft: 8 }}>
                {fmtSum(product.old_price)} so'm
              </span>
            )}
          </div>
          {avg_rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FDF6F0', borderRadius: 8, padding: '4px 10px' }}>
              <span style={{ color: '#F59E0B', fontSize: 13 }}>★</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{avg_rating.toFixed(1)}</span>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>({review_count})</span>
            </div>
          )}
        </div>

        {/* Size selector */}
        {product.sizes?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>O'lcham / Размер</span>
              {selSize && <span style={{ fontSize: 11, color: '#C9956C', fontWeight: 600 }}>Tanlandi: {selSize}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {product.sizes.map(s => {
                const avail = stocks.filter(st => st.size === s).reduce((sum, st) => sum + st.quantity, 0) > 0
                return (
                  <button key={s} onClick={() => avail && setSelSize(s)} disabled={!avail} style={{
                    minWidth: 48, height: 36, borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: avail ? 'pointer' : 'not-allowed', padding: '0 10px',
                    border: selSize === s ? '2px solid #C9956C' : '1.5px solid #E5E7EB',
                    background: selSize === s ? '#FDF6F0' : avail ? '#fff' : '#F9FAFB',
                    color: selSize === s ? '#C9956C' : avail ? '#374151' : '#D1D5DB',
                    textTransform: 'uppercase', position: 'relative',
                  }}>
                    {s}
                    {!avail && <span style={{ position: 'absolute', top: -1, right: -1, width: 6, height: 6, background: '#EF4444', borderRadius: '50%' }} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Color selector */}
        {product.colors?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Rang / Цвет</span>
              {selColor && <span style={{ fontSize: 11, color: '#C9956C', fontWeight: 600 }}>Tanlandi: {selColor}</span>}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {product.colors.map(c => {
                const hex = COLOR_MAP[c?.toLowerCase()] || '#C9956C'
                const isWhite = c?.toLowerCase() === 'white'
                return (
                  <button key={c} onClick={() => setSelColor(c)} title={c} style={{
                    width: 34, height: 34, borderRadius: '50%', background: hex, border: 'none', cursor: 'pointer',
                    boxShadow: selColor === c ? `0 0 0 3px #fff, 0 0 0 5px #C9956C` : isWhite ? '0 0 0 1px #E5E7EB' : '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'box-shadow .15s',
                  }} />
                )
              })}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Miqdor / Количество</span>
          <CounterButton
            value={qty}
            onChange={setQty}
            min={1}
            max={selSize && selColor ? stockFor(selSize, selColor) || 99 : 99}
          />
        </div>

        {/* Stock info */}
        {selSize && selColor && (
          <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 500, color: stockFor(selSize, selColor) > 0 ? '#16A34A' : '#EF4444' }}>
            {stockFor(selSize, selColor) > 0
              ? `✓ Omborida: ${stockFor(selSize, selColor)} ta`
              : '✗ Bu o\'lcham/rang tugagan'}
          </div>
        )}

        {/* Total */}
        {(selSize || !product.sizes?.length) && (selColor || !product.colors?.length) && (
          <div style={{ background: '#FDF6F0', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>Jami / Итого:</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#C9956C' }}>{fmtSum(product.price * qty)} so'm</span>
          </div>
        )}

        {/* Error */}
        {err && (
          <div style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 10, padding: '10px 14px', fontSize: 12, marginBottom: 12, fontWeight: 500 }}>
            ⚠ {err}
          </div>
        )}

        {/* Add to cart button */}
        <button
          onClick={addToCart}
          disabled={adding}
          style={{
            width: '100%', height: 56, borderRadius: 14,
            background: added ? '#16A34A' : '#C9956C',
            color: '#fff', border: 'none', fontSize: 15, fontWeight: 700,
            cursor: adding ? 'not-allowed' : 'pointer', transition: 'background .3s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(201,149,108,0.35)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          {added ? "SAVATGA QO'SHILDI ✓" : adding ? "QO'SHILMOQDA..." : "SAVATCHAGA QO'SHISH / В КОРЗИНУ"}
        </button>

        {/* Description */}
        {product.description_uz && (
          <div style={{ marginTop: 16, borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
            <button onClick={() => setDescOpen(!descOpen)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Tavsif / Описание</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ transform: descOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {descOpen && (
              <div style={{ marginTop: 10, fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                {product.description_uz}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── REVIEWS section ──────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', marginTop: 8, padding: '16px 16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Sharhlar</span>
            {avg_rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Stars rating={Math.round(avg_rating)} size={14} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{avg_rating.toFixed(1)}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>({review_count} ta sharh)</span>
              </div>
            )}
          </div>
          {user?.id && (
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              style={{ padding: '7px 12px', background: showReviewForm ? '#F3F4F6' : '#FDF6F0', border: `1px solid ${showReviewForm ? '#E5E7EB' : '#C9956C'}`, borderRadius: 8, fontSize: 11, fontWeight: 600, color: showReviewForm ? '#6B7280' : '#C9956C', cursor: 'pointer' }}
            >
              {showReviewForm ? 'Yopish' : '+ Sharh qoldirish'}
            </button>
          )}
        </div>

        {/* Review form */}
        {showReviewForm && (
          <div style={{ background: '#FDF6F0', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Bahoyingiz:</div>
            <Stars rating={reviewRating} size={28} interactive onRate={setReviewRating} />
            <textarea
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              placeholder="Fikringizni yozing... (ixtiyoriy)"
              style={{ width: '100%', marginTop: 10, border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 12, resize: 'none', outline: 'none', minHeight: 72, fontFamily: 'inherit', color: '#374151' }}
            />
            <button
              onClick={submitReview}
              disabled={!reviewRating || submitting}
              style={{ marginTop: 10, width: '100%', height: 40, borderRadius: 8, background: reviewRating ? '#C9956C' : '#E5E7EB', color: reviewRating ? '#fff' : '#9CA3AF', border: 'none', fontWeight: 600, fontSize: 13, cursor: reviewRating ? 'pointer' : 'not-allowed' }}
            >
              {submitting ? 'Yuborilmoqda...' : 'Sharh yuborish'}
            </button>
          </div>
        )}

        {/* Reviews list */}
        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>💬</div>
            Hali sharh yo'q. Birinchi bo'ling!
          </div>
        ) : (
          reviews.map(r => <ReviewCard key={r.id} review={r} />)
        )}
      </div>
    </div>
  )
}
