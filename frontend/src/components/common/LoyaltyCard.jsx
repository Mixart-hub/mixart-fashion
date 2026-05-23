import React from 'react'

const LEVEL_CONFIG = {
  bronze: { label: '🥉 Bronze', color: '#b45309', bg: '#fef3c7', next: 'silver', threshold: 150 },
  silver: { label: '🥈 Silver', color: '#6b7280', bg: '#f3f4f6', next: 'gold',   threshold: 500 },
  gold:   { label: '🥇 Gold',   color: '#d97706', bg: '#fef3c7', next: null,      threshold: null },
}

const TXT = {
  uz: { title: 'Loyallik dasturi', points: 'ball', discount: 'chegirma', referral: 'Referral', copy: 'Nusxa' },
  ru: { title: 'Программа лояльности', points: 'балл', discount: 'скидка', referral: 'Реферал', copy: 'Копировать' },
  en: { title: 'Loyalty program', points: 'pts', discount: 'discount', referral: 'Referral', copy: 'Copy' },
}

export default function LoyaltyCard({ loyalty, lang = 'uz' }) {
  if (!loyalty) return null
  const tx = TXT[lang] || TXT.uz
  const level = loyalty.level || 'bronze'
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.bronze
  const progress = cfg.threshold ? Math.min(100, ((loyalty.total_spent || 0) / cfg.threshold) * 100) : 100

  return (
    <div style={{
      background: 'linear-gradient(135deg,#1C1C1E,#6b2048)',
      borderRadius: 18, padding: 18, color: '#fff',
      boxShadow: '0 4px 20px rgba(28,28,30,.25)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, opacity: .75, marginBottom: 4 }}>{tx.title}</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>
            {(loyalty.points || 0).toLocaleString('ru-RU')}
            <span style={{ fontSize: 13, fontWeight: 400, opacity: .75, marginLeft: 4 }}>{tx.points}</span>
          </div>
          {loyalty.discount_percent > 0 && (
            <div style={{ fontSize: 11, opacity: .8, marginTop: 2 }}>
              🏷 {loyalty.discount_percent}% {tx.discount}
            </div>
          )}
        </div>
        <div style={{
          background: cfg.color, padding: '5px 14px',
          borderRadius: 20, fontSize: 12, fontWeight: 700
        }}>
          {cfg.label}
        </div>
      </div>

      {cfg.next && (
        <>
          <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, height: 6, marginTop: 14 }}>
            <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 8, height: 6, width: `${progress}%`, transition: 'width .5s' }} />
          </div>
          <div style={{ fontSize: 10, opacity: .65, marginTop: 5 }}>
            {LEVEL_CONFIG[cfg.next]?.label} → {(loyalty.total_spent || 0).toLocaleString('ru-RU')} / {cfg.threshold?.toLocaleString('ru-RU')} so'm
          </div>
        </>
      )}

      {loyalty.referral_code && (
        <div style={{ marginTop: 12, background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, opacity: .8 }}>
            🔗 {tx.referral}: <b>{loyalty.referral_code}</b>
          </span>
          <button
            onClick={() => navigator.clipboard?.writeText(loyalty.referral_code)}
            style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '3px 8px', fontSize: 10, cursor: 'pointer' }}
          >{tx.copy}</button>
        </div>
      )}
    </div>
  )
}

