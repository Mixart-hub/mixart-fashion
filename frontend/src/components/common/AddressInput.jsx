import React from 'react'

const LABELS = {
  uz: { label: '📍 Yetkazib berish manzili', placeholder: 'Shahar, ko\'cha, uy raqami...', geo: 'GPS', note: '📝 Izoh', notePlaceholder: 'Maxsus talab...' },
  ru: { label: '📍 Адрес доставки', placeholder: 'Город, улица, дом...', geo: 'GPS', note: '📝 Примечание', notePlaceholder: 'Особые пожелания...' },
  en: { label: '📍 Delivery address', placeholder: 'City, street, building...', geo: 'GPS', note: '📝 Note', notePlaceholder: 'Special requests...' },
}

export default function AddressInput({ address, onAddress, note, onNote, lang = 'uz', onGPS }) {
  const tx = LABELS[lang] || LABELS.uz

  async function getLocation() {
    if (!navigator.geolocation || !onGPS) return
    navigator.geolocation.getCurrentPosition(
      pos => onGPS(pos.coords.latitude, pos.coords.longitude),
      () => {}
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6', padding: 14, marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1C1C1E', marginBottom: 8 }}>{tx.label}</div>
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <textarea
          value={address}
          onChange={e => onAddress(e.target.value)}
          placeholder={tx.placeholder}
          rows={2}
          style={{
            width: '100%', border: '1px solid #F3F4F6', borderRadius: 10,
            padding: '8px 40px 8px 10px', fontSize: 12, outline: 'none',
            resize: 'none', fontFamily: 'inherit',
          }}
        />
        {onGPS && (
          <button onClick={getLocation} title={tx.geo} style={{
            position: 'absolute', right: 8, top: 8,
            width: 26, height: 26, borderRadius: 6, border: 'none',
            background: '#f3edf0', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>📍</button>
        )}
      </div>
      {onNote !== undefined && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1C1C1E', marginBottom: 6 }}>{tx.note}</div>
          <input
            value={note}
            onChange={e => onNote(e.target.value)}
            placeholder={tx.notePlaceholder}
            style={{
              width: '100%', border: '1px solid #F3F4F6', borderRadius: 10,
              padding: '8px 10px', fontSize: 12, outline: 'none',
            }}
          />
        </>
      )}
    </div>
  )
}

