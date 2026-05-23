import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, total, perPage, onChange }) {
  if (totalPages <= 1) return null

  const from = (page - 1) * perPage + 1
  const to   = Math.min(page * perPage, total)

  const pages = []
  const delta = 1
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <span className="text-sm text-gray-500">
        {from}–{to} / jami {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft size={14} className="text-gray-500" />
        </button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`d${i}`} className="px-2 text-gray-400 text-sm">...</span>
            : <button
                key={p}
                onClick={() => onChange(p)}
                className={`min-w-[32px] h-8 text-sm rounded-lg border transition-colors ${
                  p === page
                    ? 'bg-primary text-white border-primary font-medium'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >{p}</button>
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight size={14} className="text-gray-500" />
        </button>
      </div>
    </div>
  )
}
