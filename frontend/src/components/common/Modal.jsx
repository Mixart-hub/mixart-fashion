import React, { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          zIndex: 1000, backdropFilter: 'blur(2px)',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        maxWidth: 480, margin: '0 auto',
        background: '#fff', borderRadius: '20px 20px 0 0',
        zIndex: 1001, maxHeight: '80vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp .25s ease',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#F3F4F6' }} />
        </div>
        {/* Header */}
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>{title}</span>
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: '#f3edf0', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
          </div>
        )}
        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div style={{ padding: '12px 20px', borderTop: '0.5px solid #F3F4F6' }}>
            {footer}
          </div>
        )}
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </>
  )
}

