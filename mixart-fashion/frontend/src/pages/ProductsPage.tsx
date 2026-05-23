import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import ProductGrid from '../components/ProductGrid'
import Layout from '../components/Layout'
import Breadcrumb from '../components/ui/Breadcrumb'

interface Category { id: string; nameUz: string; nameRu: string; nameEn: string }
interface SearchResult { products: any[]; total: number; page: number; pages: number }

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42']
const SORT_OPTIONS = [
  { value: '', label: 'Tavsiya etilgan' },
  { value: 'newest', label: 'Yangi' },
  { value: 'price_asc', label: 'Arzon avval' },
  { value: 'price_desc', label: 'Qimmat avval' },
]

export default function ProductsPage() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [result, setResult] = useState<SearchResult>({ products: [], total: 0, page: 1, pages: 1 })
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const lang = i18n.language as 'uz' | 'ru' | 'en'

  const q = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const sort = searchParams.get('sort') || ''
  const size = searchParams.get('size') || ''
  const page = parseInt(searchParams.get('page') || '1')

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value); else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    if (sort) params.set('sort', sort)
    if (size) params.set('size', size)
    params.set('page', String(page))
    params.set('limit', '20')
    try {
      const data = await api.get<SearchResult>(`/search?${params}`)
      setResult(data)
    } finally {
      setLoading(false)
    }
  }, [q, category, sort, size, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(() => {})
  }, [])

  const nameKey = { uz: 'nameUz', ru: 'nameRu', en: 'nameEn' }[lang] as keyof Category

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.catalog') }]} />

        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="section-title">{q ? `"${q}"` : t('nav.catalog')}</h1>
            <p className="text-dark-muted text-sm mt-1">{result.total} ta mahsulot</p>
          </div>
          <select value={sort} onChange={e => setParam('sort', e.target.value)}
            className="input py-2 px-4 text-sm w-auto">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex gap-6">
          {/* Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="card p-5 space-y-6 sticky top-24">
              <div>
                <h3 className="font-semibold text-sm mb-3">Kategoriya</h3>
                <div className="space-y-1">
                  <button onClick={() => setParam('category', '')}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${!category ? 'bg-rose text-white' : 'hover:bg-cream'}`}>
                    {t('common.all')}
                  </button>
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setParam('category', cat.id)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${category === cat.id ? 'bg-rose text-white' : 'hover:bg-cream'}`}>
                      {cat[nameKey] as string}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-3">{t('product.size')}</h3>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map(s => (
                    <button key={s} onClick={() => setParam('size', size === s ? '' : s)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
                        ${size === s ? 'bg-rose text-white border-rose' : 'border-cream hover:border-rose'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setSearchParams({})} className="btn-outline w-full text-sm py-2">
                Tozalash
              </button>
            </div>
          </aside>

          <div className="flex-1">
            <ProductGrid products={result.products} loading={loading} cols={3} />
            {result.pages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: result.pages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setParam('page', String(p))}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors
                      ${p === page ? 'bg-rose text-white' : 'hover:bg-cream text-dark'}`}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
