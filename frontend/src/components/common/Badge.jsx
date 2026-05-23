import React from 'react'

const PRESETS = {
  new:        { bg: '#dcfce7', color: '#16a34a', label: 'Yangi' },
  processing: { bg: '#fef3c7', color: '#b45309', label: 'Jarayonda' },
  shipped:    { bg: '#e0f2fe', color: '#0369a1', label: "Yo'lda" },
  delivered:  { bg: '#dcfce7', color: '#16a34a', label: 'Yetkazildi' },
  cancelled:  { bg: '#fee2e2', color: '#dc2626', label: 'Bekor' },
  returned:   { bg: '#ede9fe', color: '#7c3aed', label: 'Qaytarildi' },
  paid:       { bg: '#dcfce7', color: '#16a34a', label: "To'langan" },
  pending:    { bg: '#fef3c7', color: '#b45309', label: 'Kutilmoqda' },
  failed:     { bg: '#fee2e2', color: '#dc2626', label: 'Xato' },
}

export default function Badge({ type, label, bg, color, size = 11 }) {
  const preset = PRESETS[type] || {}
  const bgColor = bg || preset.bg || '#F3F4F6'
  const textColor = color || preset.color || '#C9956C'
  const text = label || preset.label || type

  return (
    <span style={{
      display: 'inline-block',
      background: bgColor,
      color: textColor,
      fontSize: size,
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 20,
      lineHeight: 1.4,
    }}>{text}</span>
  )
}

