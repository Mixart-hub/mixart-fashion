import React from 'react'
import { useNavigate } from 'react-router-dom'

const MEDIA_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')

function fixUrl(url) {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return MEDIA_BASE + url
}

const USD_RATE = window.__USD_RATE__ || 12700

function fmtSum(price) {
  if (!price) return '0'
  return Math.round(Number(price)).toLocaleString('ru-RU')
}

function fmtUsd(sumPrice) {
  if (!sumPrice) return '0'
  return (Number(sumPrice) / USD_RATE).toFixed(2)
}

export default function ProductCard({ product, style }) {
  const nav = useNavigate()
  const img = product.images && product.images.length > 0 ? fixUrl(product.images[0]) : null
  const discount = product.old_price
    ? Math.round((1 - product.price / product.old_price) * 100) : null

  return (
    <div
      onClick={() => nav('/product/' + product.id)}
      style={Object.assign({
        width: 130, flexShrink: 0, borderRadius: 12,
        background: '#fff', border: '0.5px solid #F3F4F6',
        overflow: 'hidden', cursor: 'pointer'
      }, style || {})}
    >
      <div style={{ height: 140, background: '#FDF6F0', position: 'relative', overflow: 'hidden' }}>
        {img ? (
          <img
            src={img}
            alt={product.name_uz}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={function(e) {
              e.target.style.display = 'none'
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <div style={{ display: img ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 40 }}>👗</div>
        {discount ? (
          <span style={{ position: 'absolute', top: 6, left: 6, background: '#C9956C', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 5, fontWeight: 600 }}>
            -{discount}%
          </span>
        ) : null}
        {product.is_new_arrival ? (
          <span style={{ position: 'absolute', top: 6, right: 6, background: '#16a34a', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 5, fontWeight: 600 }}>
            Yangi
          </span>
        ) : null}
      </div>
      <div style={{ padding: '8px 9px 10px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#1C1C1E', marginBottom: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {product.name_uz}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#C9956C' }}>
          {fmtSum(product.price)} <span style={{ fontSize: 9, color: '#6B7280', fontWeight: 500 }}>so'm</span>
        </div>
        <div style={{ fontSize: 9, color: '#16a34a', marginTop: 1 }}>
          ≈ ${fmtUsd(product.price)}
        </div>
        {product.old_price ? (
          <div style={{ fontSize: 9, color: '#9CA3AF', textDecoration: 'line-through', marginTop: 1 }}>{fmtSum(product.old_price)}</div>
        ) : null}
      </div>
    </div>
  )
}

