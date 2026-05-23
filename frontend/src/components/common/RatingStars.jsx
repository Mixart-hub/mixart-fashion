import React from 'react'

export default function RatingStars({ rating = 0, count = null, size = 14, interactive = false, onChange }) {
  const stars = [1, 2, 3, 4, 5]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {stars.map(s => (
        <span
          key={s}
          onClick={() => interactive && onChange?.(s)}
          style={{
            fontSize: size,
            color: s <= Math.round(rating) ? '#f59e0b' : '#e5e7eb',
            cursor: interactive ? 'pointer' : 'default',
            lineHeight: 1,
            transition: 'color .1s',
          }}
        >★</span>
      ))}
      {count !== null && (
        <span style={{ fontSize: size - 2, color: '#6B7280', marginLeft: 4 }}>({count})</span>
      )}
    </div>
  )
}

