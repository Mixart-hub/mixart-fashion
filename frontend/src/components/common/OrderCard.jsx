import React, { useState } from 'react'
import Badge from './Badge'

function fmtMoney(v) { return v ? Math.round(Number(v)).toLocaleString('ru-RU') : '0' }

const STATUS = {
  new:        { icon: '🆕' },
  processing: { icon: '⚙️' },
  shipped:    { icon: '🚚' },
  delivered:  { icon: '✅' },
  cancelled:  { icon: '❌' },
  returned:   { icon: '↩️' },
}

export default function OrderCard({ order, lang = 'uz', onClick }) {
  const st = STATUS[order.status] || STATUS.new

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 14, border: '0.5px solid #F3F4F6',
        padding: 14, marginBottom: 8, cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E' }}>
            {st.icon} #{order.id}
          </div>
          <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
            {order.created_at?.slice(0, 10)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Badge type={order.status} />
          <div style={{ fontSize: 14, fontWeight: 700, color: '#C9956C', marginTop: 4 }}>
            {fmtMoney(order.final_amount)} so'm
          </div>
        </div>
      </div>
      {order.delivery_address && (
        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>
          📍 {order.delivery_address}
        </div>
      )}
    </div>
  )
}

