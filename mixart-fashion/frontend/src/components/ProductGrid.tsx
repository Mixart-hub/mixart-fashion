import ProductCard from './ProductCard'
import LoadingSpinner from './ui/LoadingSpinner'
import { useTranslation } from 'react-i18next'

interface Product {
  id: string; name: string; nameUz: string; nameRu: string; nameEn: string
  price: number; comparePrice?: number; images: string[]
  category?: any; reviews?: any[]; stock: number
}

interface Props {
  products: Product[]
  loading?: boolean
  cols?: 2 | 3 | 4
}

export default function ProductGrid({ products, loading, cols = 4 }: Props) {
  const { t } = useTranslation()
  const grid = { 2: 'grid-cols-2', 3: 'grid-cols-2 md:grid-cols-3', 4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' }[cols]

  if (loading) return <LoadingSpinner size="lg" />
  if (!products.length) return (
    <div className="text-center py-16">
      <p className="text-4xl mb-4">🛍</p>
      <p className="text-dark-muted">{t('common.not_found')}</p>
    </div>
  )

  return (
    <div className={`grid ${grid} gap-4 md:gap-6`}>
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  )
}
