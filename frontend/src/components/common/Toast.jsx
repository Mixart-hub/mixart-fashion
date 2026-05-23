import React, { useEffect, useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)

  function show(message, type = 'success', duration = 2500) {
    setToast({ message, type })
    setTimeout(() => setToast(null), duration)
  }

  return { toast, show }
}

export default function Toast({ message, type = 'success' }) {
  if (!message) return null

  const colors = {
    success: { bg: '#16a34a', icon: '✅' },
    error:   { bg: '#dc2626', icon: '❌' },
    info:    { bg: '#0369a1', icon: 'ℹ️' },
    warning: { bg: '#b45309', icon: '⚠️' },
  }
  const { bg, icon } = colors[type] || colors.success

  return (
    <div style={{
      position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, maxWidth: 340, width: '90%',
      background: bg, color: '#fff',
      borderRadius: 12, padding: '12px 18px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,.2)',
      animation: 'slideDown 0.3s ease',
      fontSize: 13, fontWeight: 500,
    }}>
      <span>{icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}

