import React from 'react'

export default function CategoryChip({ emoji, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0, padding: '4px 2px',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: active ? '#FDF6F0' : '#f5f0f2',
        border: active ? '2px solid #C9956C' : '2px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, transition: 'all .15s',
      }}>{emoji}</div>
      <span style={{ fontSize: 9, color: active ? '#C9956C' : '#6B7280', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

