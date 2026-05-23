import React, { useRef } from 'react'

export default function SearchBar({ value, onChange, placeholder = 'Qidirish...', onMic, micActive, onBack, sticky = true }) {
  const inputRef = useRef()

  return (
    <div style={{
      background: '#1C1C1E', padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 8,
      ...(sticky ? { position: 'sticky', top: 0, zIndex: 10 } : {}),
    }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}
        >←</button>
      )}
      <div style={{ flex: 1, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: .6 }}>🔍</span>
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8,
            background: 'rgba(255,255,255,.12)', border: 'none',
            borderRadius: 10, color: '#fff', fontSize: 12, outline: 'none',
          }}
        />
      </div>
      {onMic && (
        <button
          onClick={onMic}
          style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: micActive ? '#dc2626' : 'rgba(255,255,255,.18)',
            border: 'none', cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >{micActive ? '⏹' : '🎤'}</button>
      )}
    </div>
  )
}

