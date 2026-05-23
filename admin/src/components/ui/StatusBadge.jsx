import React from 'react'

const VARIANTS = {
  new:        'bg-amber-50 text-amber-700 border-amber-100',
  pending:    'bg-amber-50 text-amber-700 border-amber-100',
  processing: 'bg-blue-50 text-blue-700 border-blue-100',
  shipped:    'bg-violet-50 text-violet-700 border-violet-100',
  delivered:  'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled:  'bg-red-50 text-red-700 border-red-100',
  active:     'bg-emerald-50 text-emerald-700 border-emerald-100',
  inactive:   'bg-gray-100 text-gray-500 border-gray-200',
  paid:       'bg-emerald-50 text-emerald-700 border-emerald-100',
  unpaid:     'bg-red-50 text-red-700 border-red-100',
  low:        'bg-orange-50 text-orange-700 border-orange-100',
  out:        'bg-red-50 text-red-700 border-red-100',
  in_stock:   'bg-emerald-50 text-emerald-700 border-emerald-100',
}

const LABELS = {
  new:        'Yangi',
  pending:    'Kutilmoqda',
  processing: 'Jarayonda',
  shipped:    'Yuborildi',
  delivered:  'Yetkazildi',
  cancelled:  'Bekor qilindi',
  active:     'Faol',
  inactive:   'Faol emas',
  paid:       "To'langan",
  unpaid:     "To'lanmagan",
  low:        'Kam qoldi',
  out:        'Tugagan',
  in_stock:   'Mavjud',
}

export default function StatusBadge({ status, label }) {
  const key = status?.toLowerCase().replace(' ', '_')
  const cls = VARIANTS[key] || 'bg-gray-100 text-gray-600 border-gray-200'
  const text = label || LABELS[key] || status

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {text}
    </span>
  )
}
