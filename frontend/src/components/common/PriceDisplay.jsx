import React from 'react'

const USD_RATE = () => window.__USD_RATE__ || 12700

function fmt(v) { return v ? Math.round(Number(v)).toLocaleString('ru-RU') : '0' }
function usd(v) { return v ? (Number(v) / USD_RATE()).toFixed(2) : '0' }

export default function PriceDisplay({ price, oldPrice, showUsd = true, size = 'md', style = {} }) {
  const mainSize = size === 'lg' ? 22 : size === 'sm' ? 13 : 16
  const subSize = size === 'lg' ? 12 : size === 'sm' ? 9 : 11
  const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : null

  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: mainSize, fontWeight: 700, color: '#C9956C' }}>{fmt(price)}</span>
        <span style={{ fontSize: subSize, color: '#6B7280' }}>so'm</span>
        {discount && (
          <span style={{ fontSize: subSize, background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
            −{discount}%
          </span>
        )}
      </div>
      {showUsd && (
        <div style={{ fontSize: subSize, color: '#16a34a', marginTop: 2 }}>≈ ${usd(price)}</div>
      )}
      {oldPrice && (
        <div style={{ fontSize: subSize, color: '#9CA3AF', textDecoration: 'line-through' }}>{fmt(oldPrice)} so'm</div>
      )}
    </div>
  )
}

