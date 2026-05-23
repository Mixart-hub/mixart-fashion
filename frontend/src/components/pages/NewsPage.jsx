import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/store'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const MEDIA_BASE = API_BASE.replace('/api', '')

const TAG_LABELS = { news: { uz: 'Yangilik', ru: 'Новость' }, promo: { uz: 'Aksiya', ru: 'Акция' }, campaign: { uz: 'Kampaniya', ru: 'Кампания' } }
const TAG_COLORS = { news: '#3B82F6', promo: '#F97316', campaign: '#10B981' }

export default function NewsPage() {
  const nav = useNavigate()
  const { lang } = useStore()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [tag, setTag] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setLoading(true)
    const url = `${API_BASE}/news${tag ? `?tag=${tag}` : ''}`
    fetch(url).then(r => r.json()).then(d => { setList(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [tag])

  const title = (item) => (lang === 'ru' ? item.title_ru : item.title_uz) || item.title_uz || item.title_ru || ''
  const body  = (item) => (lang === 'ru' ? item.body_ru  : item.body_uz)  || item.body_uz  || item.body_ru  || ''
  const imgSrc = (item) => {
    if (!item.image) return null
    return item.image.startsWith('http') ? item.image : `${MEDIA_BASE}${item.image}`
  }

  const FILTERS = [
    { value: '', label: lang === 'ru' ? 'Все' : 'Barchasi' },
    { value: 'news', label: lang === 'ru' ? 'Новости' : 'Yangiliklar' },
    { value: 'promo', label: lang === 'ru' ? 'Акции' : 'Aksiyalar' },
    { value: 'campaign', label: lang === 'ru' ? 'Кампании' : 'Kampaniyalar' },
  ]

  if (selected) {
    return (
      <div style={{ background: '#F8F8F8', minHeight: '100vh' }}>
        <div style={{ background: '#1C1C1E', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9956C', fontSize: 22, lineHeight: 1 }}>←</button>
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{title(selected)}</span>
        </div>
        {imgSrc(selected) && (
          <img src={imgSrc(selected)} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
        )}
        <div style={{ padding: '20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ background: TAG_COLORS[selected.tag] + '20', color: TAG_COLORS[selected.tag], fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
              {TAG_LABELS[selected.tag]?.[lang] || selected.tag}
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{selected.created_at?.slice(0, 10)}</span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', lineHeight: 1.4, marginBottom: 12 }}>{title(selected)}</h2>
          {body(selected) && (
            <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.7 }}>{body(selected)}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#F8F8F8', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#1C1C1E', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9956C', fontSize: 22, lineHeight: 1 }}>←</button>
        <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
          {lang === 'ru' ? 'Новости и акции' : 'Yangiliklar va aksiyalar'}
        </span>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setTag(f.value)}
            style={{
              background: tag === f.value ? '#C9956C' : '#fff',
              color: tag === f.value ? '#fff' : '#6B7280',
              border: `1.5px solid ${tag === f.value ? '#C9956C' : '#E5E7EB'}`,
              borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px 16px' }}>
        {loading ? (
          [0, 1, 2].map(i => (
            <div key={i} style={{ background: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', opacity: 0.6 }}>
              <div style={{ height: 140, background: '#F3F4F6' }} />
              <div style={{ padding: '14px 16px' }}>
                <div style={{ height: 14, background: '#E5E7EB', borderRadius: 4, width: '60%', marginBottom: 8 }} />
                <div style={{ height: 12, background: '#F3F4F6', borderRadius: 4, width: '80%' }} />
              </div>
            </div>
          ))
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📰</div>
            <p style={{ fontSize: 14 }}>{lang === 'ru' ? 'Новостей нет' : 'Yangiliklar yo\'q'}</p>
          </div>
        ) : list.map(item => (
          <div
            key={item.id}
            onClick={() => setSelected(item)}
            style={{ background: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {imgSrc(item) && (
              <img src={imgSrc(item)} alt={title(item)} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
            )}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ background: (TAG_COLORS[item.tag] || '#6B7280') + '20', color: TAG_COLORS[item.tag] || '#6B7280', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  {TAG_LABELS[item.tag]?.[lang] || item.tag}
                </span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{item.created_at?.slice(0, 10)}</span>
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', lineHeight: 1.4, marginBottom: 4 }}>{title(item)}</h3>
              {body(item) && (
                <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {body(item)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
