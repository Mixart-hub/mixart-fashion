import React, { useState } from 'react'

const MEDIA_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')

function fixUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return MEDIA_BASE + url
}

export default function ImageGallery({ images = [], height = 280, placeholder = '👗' }) {
  const [active, setActive] = useState(0)

  const imgs = images.filter(Boolean)

  return (
    <div>
      {/* Main image */}
      <div style={{ height, background: '#FDF6F0', position: 'relative', overflow: 'hidden' }}>
        {imgs.length > 0 ? (
          <img
            src={fixUrl(imgs[active])}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity .2s' }}
            onError={e => { e.target.style.opacity = 0 }}
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72 }}>
            {placeholder}
          </div>
        )}
        {/* Dots */}
        {imgs.length > 1 && (
          <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {imgs.map((_, i) => (
              <div key={i} onClick={() => setActive(i)} style={{
                width: i === active ? 18 : 6, height: 6,
                borderRadius: 3, background: i === active ? '#C9956C' : 'rgba(255,255,255,.7)',
                cursor: 'pointer', transition: 'all .2s',
              }} />
            ))}
          </div>
        )}
      </div>
      {/* Thumbnails */}
      {imgs.length > 1 && (
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#fff', overflowX: 'auto' }}>
          {imgs.map((img, i) => (
            <div key={i} onClick={() => setActive(i)} style={{
              width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
              border: i === active ? '2px solid #C9956C' : '1px solid #F3F4F6',
              cursor: 'pointer', background: '#FDF6F0',
            }}>
              <img src={fixUrl(img)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

