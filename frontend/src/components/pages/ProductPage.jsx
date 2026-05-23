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

const USD_RATE = window.__USD_RATE__ || 12700
const fmtSum = p => p ? Math.round(Number(p)).toLocaleString('ru-RU') : '0'
const fmtUsd = p => p ? (Number(p) / USD_RATE).toFixed(2) : '0'

const COLOR_MAP = { beige: '#D2B48C', white: '#FFFFFF', black: '#1C1C1E', olive: '#808000', blue: '#4169E1', pink: '#FFB6C1', rose: '#C9956C', cream: '#FFFDD0', brown: '#8B4513' }

export default function ProductPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user, setCartCount, cartCount } = useStore()
  const [data, setData] = useState(null)
  const [selSize, setSelSize] = useState('')
  const [selColor, setSelColor] = useState('')
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [err, setErr] = useState('')
  const [isFav, setIsFav] = useState(false)
  const [descOpen, setDescOpen] = useState(false)

  useEffect(() => {
    productAPI.get(id).then(d => {
      setData(d)
      if (d?.product?.sizes?.length === 1) setSelSize(d.product.sizes[0])
      if (d?.product?.colors?.length === 1) setSelColor(d.product.colors[0])
    }).catch(() => nav('/catalog'))
  }, [id])

  if (!data) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#C9956C' }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>👗</div>
      <div style={{ fontSize: 13, color: '#6B7280' }}>Yuklanmoqda...</div>
    </div>
  )

  const { product, stocks = [], avg_rating, review_count } = data
  const imgs = product.images?.length > 0 ? product.images : []
  const discount = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : null

  function stockFor(size, color) {
    return stocks.filter(s => s.size === size && s.color === color).reduce((sum, s) => sum + (s.quantity || 0), 0)
  }

  async function addToCart() {
    setErr('')
    if (!selSize) { setErr("O'lchamni tanlang"); return }
    if (!selColor) { setErr("Rangni tanlang"); return }
    if (!user?.id) { setErr("Iltimos, Telegram orqali kiring"); return }
    const available = stockFor(selSize, selColor)
    if (available < qty) { setErr(`Faqat ${available} ta qoldi`); return }
    setAdding(true)
    try {
      await cartAPI.add(user.id, { product_id: product.id, size: selSize, color: selColor, quantity: qty })
      setCartCount(cartCount + qty)
      setAdded(true)
      toast.success("Savatchaga qo'shildi!")
      setTimeout(() => setAdded(false), 2500)
    } catch(e) {
      toast.error(e?.detail || "Savatga qo'shishda xato")
      setErr(e?.detail || "Savatga qo'shishda xato")
    } finally { setAdding(false) }
  }

  return (
    <div style={{ background: '#F8F8F8', paddingBottom: 90 }}>
      {/* Floating buttons */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', zIndex: 20, display: 'flex', justifyContent: 'space-between', padding: '12px 16px', pointerEvents: 'none' }}>
        <button onClick={() => nav(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(28,28,30,0.85)', border: 'none', cursor: 'pointer', pointerEvents: 'all', boxShadow: '0 2px 8px rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'all' }}>
          <button
            onClick={async () => {
              if (!user?.id) return
              const r = await productAPI.toggleFavorite(product.id, user.id).catch(() => null)
              if (r !== null) setIsFav(r?.favorited ?? !isFav)
            }}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(28,28,30,0.85)', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isFav ? '#C9956C' : 'none'} stroke={isFav ? '#C9956C' : '#fff'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          </button>
          <button style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(28,28,30,0.85)', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>

      {/* Image carousel */}
      <div style={{ position: 'relative' }}>
        <ImageGallery images={imgs} height={320} placeholder="👗" />
        {discount && (
          <span style={{ position: 'absolute', bottom: 12, left: 12, background: '#C9956C', color: '#fff', fontSize: 11, padding: '4px 10px', borderRadius: 8, fontWeight: 700, zIndex: 1 }}>
            −{discount}%
          </span>
        )}
      </div>

      {/* Product info */}
      <div style={{ background: '#fff', margin: '0', padding: '20px 16px 16px', borderRadius: '20px 20px 0 0', marginTop: -16, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', lineHeight: 1.3, marginBottom: 4 }}>
          {product.name_uz}
        </div>
        {product.name_ru && (
          <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 10 }}>{product.name_ru}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#C9956C' }}>{fmtSum(product.price)} so'm</span>
            {product.old_price && (
              <span style={{ fontSize: 14, color: '#9CA3AF', textDecoration: 'line-through', marginLeft: 8 }}>
                {fmtSum(product.old_price)} so'm
              </span>
            )}
          </div>
          {avg_rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#C9956C', fontSize: 14 }}>★</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{avg_rating.toFixed(1)}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>({review_count} ta sharh)</span>
            </div>
          )}
        </div>

        {/* Size selector */}
        {product.sizes?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>O'lcham / Размер</span>
              <button style={{ fontSize: 11, color: '#C9956C', background: 'none', border: 'none', cursor: 'pointer' }}>O'lcham qo'llanmasi 📏</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {product.sizes.map(s => {
                const avail = stocks.filter(st => st.size === s).reduce((sum, st) => sum + st.quantity, 0) > 0
                return (
                  <button key={s} onClick={() => avail && setSelSize(s)} disabled={!avail} style={{
                    width: 48, height: 36, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: avail ? 'pointer' : 'not-allowed',
                    border: selSize === s ? '2px solid #C9956C' : '1.5px solid #E5E7EB',
                    background: selSize === s ? '#FDF6F0' : avail ? '#fff' : '#F9FAFB',
                    color: selSize === s ? '#C9956C' : avail ? '#374151' : '#D1D5DB',
                    textTransform: 'uppercase',
                  }}>{s}</button>
                )
              })}
            </div>
          </div>
        )}

        {/* Color selector */}
        {product.colors?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Rang / Цвет</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {product.colors.map(c => {
                const hex = COLOR_MAP[c?.toLowerCase()] || '#C9956C'
                const isWhite = c?.toLowerCase() === 'white'
                return (
                  <button key={c} onClick={() => setSelColor(c)} style={{
                    width: 32, height: 32, borderRadius: '50%', background: hex, border: 'none', cursor: 'pointer',
                    boxShadow: selColor === c ? `0 0 0 3px #fff, 0 0 0 5px #C9956C` : isWhite ? '0 0 0 1px #E5E7EB' : 'none',
                  }} title={c} />
                )
              })}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Miqdor / Количество</span>
          <CounterButton value={qty} onChange={setQty} min={1} max={selSize && selColor ? stockFor(selSize, selColor) || 99 : 99} />
        </div>

        {/* Stock info */}
        {selSize && selColor && (
          <div style={{ marginBottom: 12, fontSize: 11, color: stockFor(selSize, selColor) > 0 ? '#16A34A' : '#EF4444', fontWeight: 500 }}>
            {stockFor(selSize, selColor) > 0 ? `✓ ${stockFor(selSize, selColor)} ta qoldi` : '✗ Tugagan'}
          </div>
        )}

        {/* Total */}
        {selSize && selColor && (
          <div style={{ background: '#FDF6F0', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6B7280' }}>Jami:</span>
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
            cursor: 'pointer', transition: 'background .3s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(201,149,108,0.35)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          {added ? "SAVATGA QO'SHILDI ✓" : adding ? "QO'SHILMOQDA..." : "SAVATCHAGA QO'SHISH / В КОРЗИНУ"}
        </button>

        {/* Description collapsible */}
        {product.description_uz && (
          <div style={{ marginTop: 16, borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
            <button
              onClick={() => setDescOpen(!descOpen)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Tavsif / Описание</span>
              <span style={{ fontSize: 16, color: '#9CA3AF', transition: 'transform .2s', transform: descOpen ? 'rotate(180deg)' : 'none' }}>⌃</span>
            </button>
            {descOpen && (
              <div style={{ marginTop: 10, fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                {product.description_uz}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
