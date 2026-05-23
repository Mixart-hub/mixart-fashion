import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import ProductGrid from '../components/ProductGrid'
import Layout from '../components/Layout'

interface Category { id: string; nameUz: string; nameRu: string; nameEn: string; imageUrl?: string; slug: string }
interface Product { id: string; name: string; nameUz: string; nameRu: string; nameEn: string; price: number; comparePrice?: number; images: string[]; stock: number; reviews?: any[] }

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const [featured, setFeatured] = useState<Product[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const lang = i18n.language as 'uz' | 'ru' | 'en'

  useEffect(() => {
    Promise.all([
      api.get<any>('/search?sort=featured&limit=8'),
      api.get<any>('/search?sort=newest&limit=8'),
      api.get<Category[]>('/categories'),
    ]).then(([feat, newest, cats]) => {
      setFeatured(feat.products)
      setNewArrivals(newest.products)
      setCategories(cats.slice(0, 6))
    }).finally(() => setLoading(false))
  }, [])

  const nameKey = { uz: 'nameUz', ru: 'nameRu', en: 'nameEn' }[lang] as keyof Category

  return (
    <Layout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-dark to-dark-light min-h-[85vh] flex items-center overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-2xl">
            <p className="text-rose font-medium tracking-widest uppercase text-sm mb-4 animate-fade-in">
              New Collection 2026
            </p>
            <h1 className="font-display text-cream text-5xl md:text-7xl font-light leading-tight mb-6 animate-slide-up">
              {t('home.hero_title').split('\n').map((line, i) => (
                <span key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </h1>
            <p className="text-cream-dark text-lg md:text-xl mb-10 max-w-lg leading-relaxed">
              {t('home.hero_sub')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products" className="btn-primary text-lg px-8 py-4">
                {t('home.hero_btn')}
              </Link>
              <Link to="/branches"
                className="border-2 border-cream text-cream px-8 py-4 rounded-full font-medium
                           hover:bg-cream hover:text-dark transition-all text-lg">
                {t('nav.branches')}
              </Link>
            </div>
            <div className="flex gap-8 mt-12">
              {[['500+', 'Mahsulot'], ['3', 'Filial'], ['5000+', 'Mijoz'], ['4.9★', 'Reyting']].map(([v, l]) => (
                <div key={l}>
                  <p className="text-rose font-bold text-2xl font-serif">{v}</p>
                  <p className="text-cream-dark text-xs mt-1">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="section-title text-center mb-10">{t('home.categories')}</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {categories.map(cat => (
                <Link key={cat.id} to={`/products?category=${cat.id}`}
                  className="group flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-rose-pale transition-colors">
                  <div className="w-16 h-16 rounded-full bg-cream-light flex items-center justify-center
                                  group-hover:bg-rose group-hover:text-white transition-colors text-2xl">
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat[nameKey] as string} className="w-full h-full object-cover rounded-full" />
                    ) : '👗'}
                  </div>
                  <span className="text-xs font-medium text-dark text-center line-clamp-2">{cat[nameKey] as string}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <h2 className="section-title">{t('home.featured')}</h2>
            <Link to="/products" className="text-rose hover:underline text-sm font-medium">Barchasini ko'rish →</Link>
          </div>
          <ProductGrid products={featured} loading={loading} cols={4} />
        </div>
      </section>

      {/* Loyalty Banner */}
      <section className="py-16 bg-rose">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="font-display text-4xl md:text-5xl font-light mb-4">{t('home.loyalty_title')}</h2>
          <p className="text-rose-pale text-lg mb-8 max-w-xl mx-auto">{t('home.loyalty_desc')}</p>
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            {[['Xarid qiling', '🛍'], ["Ball to'plang", '💎'], ['Chegirma oling', '🎁']].map(([l, e]) => (
              <div key={l} className="flex flex-col items-center gap-2">
                <span className="text-4xl">{e}</span>
                <span className="font-medium">{l}</span>
              </div>
            ))}
          </div>
          <Link to="/products" className="inline-block bg-white text-rose font-semibold px-8 py-3 rounded-full hover:bg-cream transition-colors">
            Xarid boshlash
          </Link>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <h2 className="section-title">{t('home.new_arrivals')}</h2>
            <Link to="/products?sort=newest" className="text-rose hover:underline text-sm font-medium">Barchasini ko'rish →</Link>
          </div>
          <ProductGrid products={newArrivals} loading={loading} cols={4} />
        </div>
      </section>

      {/* Branches */}
      <section className="py-16 bg-dark text-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-cream text-center mb-10">{t('home.branches_title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { city: 'Toshkent', address: "Chilonzor, Bunyodkor ko'chasi", icon: '🏙' },
              { city: 'Samarqand', address: "Registon ko'chasi, 15", icon: '🕌' },
              { city: 'Buxoro', address: "Mustaqillik ko'chasi, 8", icon: '🏛' },
            ].map(b => (
              <div key={b.city} className="bg-dark-light rounded-2xl p-6 text-center hover:bg-dark-muted/20 transition-colors">
                <span className="text-4xl">{b.icon}</span>
                <h3 className="font-serif text-xl text-rose mt-3 mb-2">{b.city}</h3>
                <p className="text-cream-dark text-sm">{b.address}</p>
                <Link to="/branches" className="inline-block mt-4 text-rose text-sm hover:underline">
                  {t('branches.view_map')} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  )
}
