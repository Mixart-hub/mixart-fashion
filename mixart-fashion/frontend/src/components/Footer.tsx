import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="bg-dark text-cream mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <span className="font-display text-3xl text-rose tracking-wider">Mixart Fashion</span>
            <p className="text-cream-dark text-sm mt-3 leading-relaxed max-w-sm">
              {t('home.hero_sub')}
            </p>
            <div className="flex gap-4 mt-5">
              <a href="https://t.me/mixartfashion" target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-dark-light flex items-center justify-center hover:bg-rose transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
              <a href="https://instagram.com/mixartfashion" target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-dark-light flex items-center justify-center hover:bg-rose transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-cream mb-4">{t('nav.catalog')}</h4>
            <ul className="space-y-2 text-sm text-cream-dark">
              {['Ayollar', 'Erkaklar', 'Bolalar', 'Sport', 'Aksessuarlar'].map(c => (
                <li key={c}>
                  <Link to={`/products?category=${c}`} className="hover:text-rose transition-colors">{c}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-cream mb-4">Aloqa</h4>
            <ul className="space-y-2 text-sm text-cream-dark">
              <li>📞 +998 90 000 00 00</li>
              <li>📧 info@mixart.fashion</li>
              <li>📍 Toshkent, Samarqand, Buxoro</li>
              <li className="mt-4">
                <Link to="/branches" className="text-rose hover:underline">{t('branches.title')} →</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-dark-light mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-cream-dark">
          <p>© {new Date().getFullYear()} Mixart Fashion. Barcha huquqlar himoyalangan.</p>
          <div className="flex gap-4">
            <span>Payme</span>
            <span>Click</span>
            <span>Visa</span>
            <span>Mastercard</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
