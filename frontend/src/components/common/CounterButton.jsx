import React from 'react'

export default function CounterButton({ value, min = 1, max = 99, onChange, size = 'md' }) {
  const btn = size === 'sm'
    ? { width: 22, height: 22, fontSize: 14 }
    : { width: 28, height: 28, fontSize: 16 }
  const numFontSize = size === 'sm' ? 12 : 14

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: size === 'sm' ? 6 : 10,
      background: '#f9eef4', borderRadius: 10,
      padding: size === 'sm' ? '4px 10px' : '6px 14px',
    }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        style={{
          ...btn, border: 'none', background: 'none',
          cursor: value <= min ? 'not-allowed' : 'pointer',
          color: value <= min ? '#d4a0b8' : '#C9956C',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
        }}
      >−</button>
      <span style={{ fontSize: numFontSize, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        style={{
          ...btn, border: 'none', background: 'none',
          cursor: value >= max ? 'not-allowed' : 'pointer',
          color: value >= max ? '#d4a0b8' : '#C9956C',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
        }}
      >+</button>
    </div>
  )
}

