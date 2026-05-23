import React from 'react'

export default function EmptyState({ emoji = '📭', title, subtitle, action, actionLabel }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 14 }}>{emoji}</div>
      {title && <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', marginBottom: 6 }}>{title}</div>}
      {subtitle && <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 20 }}>{subtitle}</div>}
      {action && actionLabel && (
        <button onClick={action} style={{
          background: '#C9956C', color: '#fff', border: 'none',
          borderRadius: 12, padding: '11px 28px',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>{actionLabel}</button>
      )}
    </div>
  )
}

