import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useCart } from '../store/cart'
import { useToast } from '../store/toast'
import { useAuth } from '../store/auth'
import PriceDisplay from './ui/PriceDisplay'

interface Product {
  id: string; name: string; nameUz: string; nameRu: string; nameEn: string
  price: number; comparePrice?: number; images: string[]
  category?: { nameUz: string; nameRu: string; nameEn: string }
  reviews?: { rating: number }[]
  stock: number
}

export default function ProductCard({ product }: { product: Product }) {
  const { t, i18n } = useTranslation()
  const { addItem } = useCart()
  const { showToast } = useToast()
  const { user } = useAuth()
  const [adding, setAdding] = useState(false)

  const lang = i18n.language as 'uz' | 'ru' | 'en'
  const nameMap = { uz: product.nameUz, ru: product.nameRu, en: product.nameEn }
  const name = nameMap[lang] || product.name

  const avgRating = product.reviews?.length
    ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length : 0

  const image = product.images?.[0] || '/placeholder.jpg'

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) { showToast(t('auth.login'), 'info'); return }
    try {
      setAdding(true)
      await addItem(product.id)
      showToast('Savatga qo\'shildi ✓', 'success')
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Link to={`/products/${product.id}`} className="card group block">
      <div className="relative overflow-hidden aspect-[3/4] bg-cream-light">
        <img
          src={image} alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg' }}
        />
        {product.comparePrice && product.comparePrice > product.price && (
          <span className="absolute top-3 left-3 badge-rose text-xs px-2 py-1 rounded-full">
            -{Math.round((1 - product.price / product.comparePrice) * 100)}%
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-dark/30 flex items-center justify-center">
            <span className="bg-white text-dark text-sm px-4 py-2 rounded-full font-medium">
              {t('product.out_of_stock')}
            </span>
          </div>
        )}
        <button
          onClick={handleAddToCart}
          disabled={adding || product.stock === 0}
          className="absolute bottom-3 right-3 bg-white text-dark rounded-full p-2.5 shadow-md
                     opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-rose hover:text-white
                     disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-dark line-clamp-2 mb-2">{name}</h3>
        {avgRating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-amber-400 text-sm">★</span>
            <span className="text-xs text-dark-muted">{avgRating.toFixed(1)}</span>
          </div>
        )}
        <PriceDisplay price={product.price} comparePrice={product.comparePrice} />
      </div>
    </Link>
  )
}
