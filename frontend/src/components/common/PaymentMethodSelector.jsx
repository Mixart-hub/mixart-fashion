import React from 'react'

const METHODS = [
  { id: 'payme', icon: '💳', label: 'Payme', color: '#1a56db' },
  { id: 'click', icon: '💳', label: 'Click', color: '#22c55e' },
  { id: 'uzum', icon: '🟣', label: 'Uzum', color: '#7c3aed' },
  { id: 'cash', icon: '💵', label: { uz: 'Naqd', ru: 'Наличные', en: 'Cash' } },
]

export default function PaymentMethodSelector({ selected, onChange, lang = 'uz' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6', padding: 14, marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1C1C1E', marginBottom: 10 }}>
        {lang === 'ru' ? '💳 Способ оплаты' : lang === 'en' ? '💳 Payment method' : '💳 To\'lov usuli'}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {METHODS.map(m => {
          const label = typeof m.label === 'string' ? m.label : m.label[lang] || m.label.uz
          const isSelected = selected === m.id
          return (
            <button key={m.id} onClick={() => onChange(m.id)} style={{
              flex: 1, minWidth: 70, padding: '9px 6px',
              borderRadius: 10, fontSize: 11, cursor: 'pointer',
              border: isSelected ? '2px solid #C9956C' : '1px solid #F3F4F6',
              background: isSelected ? '#FDF6F0' : '#fafafa',
              color: isSelected ? '#C9956C' : '#6B7280',
              fontWeight: isSelected ? 700 : 400,
              transition: 'all .15s',
            }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{m.icon}</div>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

