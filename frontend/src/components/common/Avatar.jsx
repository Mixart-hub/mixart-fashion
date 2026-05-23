import React from 'react'

export default function Avatar({ name = '?', size = 40, bgColor = '#C9956C', textColor = '#fff', style = {} }) {
  const initial = name?.trim()?.[0]?.toUpperCase() || '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bgColor, color: textColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, flexShrink: 0,
      userSelect: 'none',
      ...style
    }}>
      {initial}
    </div>
  )
}

