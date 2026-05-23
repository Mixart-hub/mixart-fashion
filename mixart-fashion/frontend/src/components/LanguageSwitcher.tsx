import { useTranslation } from 'react-i18next'
import { useState } from 'react'

const langs = [
  { code: 'uz', label: "O'z" },
  { code: 'ru', label: 'Ру' },
  { code: 'en', label: 'En' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = langs.find(l => l.code === i18n.language) || langs[0]

  const change = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('lang', code)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-sm font-medium text-dark hover:text-rose transition-colors px-2 py-1 rounded-lg hover:bg-cream"
      >
        🌐 {current.label}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-cream rounded-xl shadow-lg z-50 overflow-hidden">
          {langs.map(l => (
            <button
              key={l.code}
              onClick={() => change(l.code)}
              className={`w-full px-4 py-2 text-sm text-left hover:bg-cream transition-colors
                ${l.code === i18n.language ? 'text-rose font-medium' : 'text-dark'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
