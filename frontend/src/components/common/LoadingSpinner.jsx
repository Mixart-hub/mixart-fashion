import React from 'react'

export default function LoadingSpinner({ size = 40, text = '', color = '#C9956C' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{
        width: size, height: size,
        border: `3px solid #F3F4F6`,
        borderTop: `3px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      {text && <div style={{ marginTop: 12, fontSize: 12, color: '#9CA3AF' }}>{text}</div>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

