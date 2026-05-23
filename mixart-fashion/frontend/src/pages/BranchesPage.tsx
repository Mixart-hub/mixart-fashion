import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import Layout from '../components/Layout'
import Breadcrumb from '../components/ui/Breadcrumb'
import LoadingSpinner from '../components/ui/LoadingSpinner'

interface Branch {
  id: string; nameUz: string; nameRu: string; nameEn: string
  city: string; address: string; phone?: string; lat?: number; lng?: number
}

export default function BranchesPage() {
  const { t, i18n } = useTranslation()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const lang = i18n.language as 'uz' | 'ru' | 'en'

  useEffect(() => {
    api.get<Branch[]>('/inventory/branches')
      .then(data => { setBranches(data); if (data.length) setSelected(data[0].id) })
      .catch(() => setBranches([
        { id: '1', nameUz: 'Toshkent Filiali', nameRu: 'Ташкент', nameEn: 'Tashkent', city: 'Toshkent', address: "Chilonzor tumani, Bunyodkor ko'chasi, 47", phone: '+998901234567', lat: 41.2995, lng: 69.2401 },
        { id: '2', nameUz: 'Samarqand Filiali', nameRu: 'Самарканд', nameEn: 'Samarkand', city: 'Samarqand', address: "Registon ko'chasi, 15", phone: '+998901234568', lat: 39.6547, lng: 66.9758 },
        { id: '3', nameUz: 'Buxoro Filiali', nameRu: 'Бухара', nameEn: 'Bukhara', city: 'Buxoro', address: "Mustaqillik ko'chasi, 8", phone: '+998901234569', lat: 39.7747, lng: 64.4286 },
      ]))
      .finally(() => setLoading(false))
  }, [])

  const nameKey = { uz: 'nameUz', ru: 'nameRu', en: 'nameEn' }[lang] as keyof Branch
  const selectedBranch = branches.find(b => b.id === selected)

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('branches.title') }]} />
        <h1 className="section-title mb-8">{t('branches.title')}</h1>

        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Branch list */}
            <div className="space-y-4">
              {branches.map(branch => (
                <button key={branch.id} onClick={() => setSelected(branch.id)}
                  className={`w-full text-left card p-5 transition-all ${selected === branch.id ? 'ring-2 ring-rose bg-rose-pale/30' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">
                      {branch.city === 'Toshkent' ? '🏙' : branch.city === 'Samarqand' ? '🕌' : '🏛'}
                    </span>
                    <div>
                      <h3 className="font-serif font-semibold text-dark">{branch[nameKey] as string}</h3>
                      <p className="text-sm text-dark-muted mt-1">{branch.address}</p>
                      {branch.phone && (
                        <a href={`tel:${branch.phone}`} className="text-sm text-rose mt-2 block hover:underline">
                          📞 {branch.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Map */}
            <div className="lg:col-span-2">
              {selectedBranch?.lat && selectedBranch?.lng ? (
                <div className="card overflow-hidden h-96 lg:h-full min-h-80">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '320px' }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${selectedBranch.lat},${selectedBranch.lng}&zoom=15&output=embed`}
                    title={selectedBranch[nameKey] as string}
                  />
                </div>
              ) : selectedBranch && (
                <div className="card h-full min-h-80 flex flex-col items-center justify-center gap-4">
                  <span className="text-6xl">📍</span>
                  <div className="text-center">
                    <h3 className="font-serif text-xl font-semibold">{selectedBranch[nameKey] as string}</h3>
                    <p className="text-dark-muted mt-2">{selectedBranch.address}</p>
                    {selectedBranch.lat && selectedBranch.lng && (
                      <a href={`https://maps.google.com/?q=${selectedBranch.lat},${selectedBranch.lng}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-block mt-4 btn-primary text-sm">
                        {t('branches.view_map')}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {[
            { icon: '🕐', title: "Ish vaqti", desc: "Dush-Shan: 9:00 — 21:00\nYakshanba: 10:00 — 20:00" },
            { icon: '🚚', title: "Yetkazib berish", desc: "Shahar bo'ylab 1-2 soatda\nRegionlar bo'ylab 1-3 kunda" },
            { icon: '↩️', title: "Qaytarish", desc: "14 kun ichida muammo bo'lmay qaytarish\nSifat kafolati" },
          ].map(info => (
            <div key={info.title} className="card p-6 text-center">
              <span className="text-4xl">{info.icon}</span>
              <h3 className="font-serif font-semibold mt-3 mb-2">{info.title}</h3>
              <p className="text-sm text-dark-muted whitespace-pre-line">{info.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
