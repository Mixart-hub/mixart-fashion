import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function SearchBar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/products?q=${encodeURIComponent(q.trim())}`)
  }, [q, navigate])

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 max-w-md">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder={t('nav.search')}
        className="w-full bg-cream-light border border-cream rounded-full px-5 py-2.5 pr-12 text-sm
                   focus:outline-none focus:ring-2 focus:ring-rose focus:bg-white transition-all"
      />
      <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-rose transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </form>
  )
}
