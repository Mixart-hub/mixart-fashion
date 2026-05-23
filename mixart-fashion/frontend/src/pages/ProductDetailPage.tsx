import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { useCart } from '../store/cart'
import { useToast } from '../store/toast'
import { useAuth } from '../store/auth'
import Layout from '../components/Layout'
import Breadcrumb from '../components/ui/Breadcrumb'
import PriceDisplay from '../components/ui/PriceDisplay'
import StarRating from '../components/ui/StarRating'
import ReviewCard from '../components/ReviewCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Button from '../components/ui/Button'

interface Product {
  id: string; name: string; nameUz: string; nameRu: string; nameEn: string
  price: number; comparePrice?: number; images: string[]
  description?: string; descUz?: string; descRu?: string; descEn?: string
  sizes: string[]; colors: string[]; stock: number
  category?: { id: string; nameUz: string; nameRu: string; nameEn: string; slug: string }
}
interface ReviewData { reviews: any[]; average: number; count: number }

export default function ProductDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { addItem } = useCart()
  const { showToast } = useToast()
  const { user } = useAuth()
  const lang = i18n.language as 'uz' | 'ru' | 'en'

  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<ReviewData | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get<Product>(`/products/${id}`).then(setProduct).catch(() => {})
    api.get<ReviewData>(`/reviews/product/${id}`).then(setReviews).catch(() => {})
  }, [id])

  const nameMap = { uz: product?.nameUz, ru: product?.nameRu, en: product?.nameEn }
  const descMap = { uz: product?.descUz, ru: product?.descRu, en: product?.descEn }
  const name = nameMap[lang] || product?.name || ''
  const description = descMap[lang] || product?.description || ''

  const handleAddToCart = async () => {
    if (!user) { showToast(t('auth.login'), 'info'); return }
    if (!product) return
    try {
      setAdding(true)
      await addItem(product.id, quantity, selectedSize || undefined, selectedColor || undefined)
      showToast("Savatga qo'shildi ✓", 'success')
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !reviewRating) return
    try {
      setSubmittingReview(true)
      await api.post('/reviews', { productId: id, rating: reviewRating, comment: reviewComment })
      const data = await api.get<ReviewData>(`/reviews/product/${id}`)
      setReviews(data)
      setReviewRating(0)
      setReviewComment('')
      showToast('Sharh qoldirildi!', 'success')
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (!product) return <Layout><LoadingSpinner size="lg" /></Layout>

  const catNameKey = { uz: 'nameUz', ru: 'nameRu', en: 'nameEn' }[lang] as 'nameUz' | 'nameRu' | 'nameEn'

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.catalog'), href: '/products' },
          ...(product.category ? [{ label: product.category[catNameKey], href: `/products?category=${product.category.id}` }] : []),
          { label: name }
        ]} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl overflow-hidden bg-cream-light">
              <img
                src={product.images[selectedImage] || '/placeholder.jpg'}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors
                      ${selectedImage === i ? 'border-rose' : 'border-transparent'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              {product.category && (
                <Link to={`/products?category=${product.category.id}`}
                  className="text-sm text-dark-muted uppercase tracking-widest hover:text-rose transition-colors">
                  {product.category[catNameKey]}
                </Link>
              )}
              <h1 className="text-3xl md:text-4xl font-serif font-semibold text-dark mt-2">{name}</h1>

              {reviews && reviews.count > 0 && (
                <div className="flex items-center gap-3 mt-3">
                  <StarRating value={Math.round(reviews.average)} size="md" />
                  <span className="text-sm text-dark-muted">{reviews.average.toFixed(1)} ({reviews.count} sharh)</span>
                </div>
              )}
            </div>

            <PriceDisplay price={product.price} comparePrice={product.comparePrice} large />

            {/* Sizes */}
            {product.sizes.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-3">{t('product.size')}</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(s => (
                    <button key={s} onClick={() => setSelectedSize(size => size === s ? '' : s)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-colors
                        ${selectedSize === s ? 'border-rose bg-rose text-white' : 'border-cream hover:border-rose'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors */}
            {product.colors.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-3">{t('product.color')}</p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map(c => (
                    <button key={c} onClick={() => setSelectedColor(col => col === c ? '' : c)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm transition-colors
                        ${selectedColor === c ? 'border-rose bg-rose-pale text-rose' : 'border-cream hover:border-rose'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <p className="font-semibold text-sm mb-3">{t('product.quantity')}</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-full border-2 border-cream flex items-center justify-center
                             text-lg font-bold hover:border-rose transition-colors">−</button>
                <span className="text-xl font-semibold w-8 text-center">{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  className="w-10 h-10 rounded-full border-2 border-cream flex items-center justify-center
                             text-lg font-bold hover:border-rose transition-colors">+</button>
                <span className="text-sm text-dark-muted ml-2">
                  {product.stock > 0 ? `${product.stock} dona mavjud` : t('product.out_of_stock')}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleAddToCart} loading={adding} disabled={product.stock === 0} size="lg" className="flex-1">
                {t('product.add_to_cart')}
              </Button>
              <Link to="/checkout">
                <Button variant="outline" size="lg">{t('product.buy_now')}</Button>
              </Link>
            </div>

            {/* Description */}
            {description && (
              <div className="border-t border-cream pt-6">
                <h3 className="font-semibold mb-3">{t('product.description')}</h3>
                <p className="text-dark-muted leading-relaxed text-sm">{description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <section className="border-t border-cream pt-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="section-title">{t('product.reviews')} ({reviews?.count || 0})</h2>
            {reviews && reviews.count > 0 && (
              <div className="flex items-center gap-2">
                <StarRating value={Math.round(reviews.average)} />
                <span className="font-semibold text-lg">{reviews.average.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Write review */}
          {user ? (
            <form onSubmit={handleReviewSubmit} className="card p-6 mb-8">
              <h3 className="font-semibold mb-4">{t('review.title')}</h3>
              <div className="mb-4">
                <p className="text-sm text-dark-muted mb-2">{t('review.rating')}</p>
                <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
              </div>
              <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                placeholder={t('review.comment')} rows={3}
                className="input resize-none mb-4" />
              <Button type="submit" loading={submittingReview} disabled={!reviewRating}>
                {t('review.submit')}
              </Button>
            </form>
          ) : (
            <div className="card p-6 mb-8 text-center">
              <p className="text-dark-muted mb-4">{t('review.login_to_review')}</p>
              <Link to="/login"><Button variant="outline">{t('auth.login')}</Button></Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews?.reviews.map(r => <ReviewCard key={r.id} review={r} />)}
          </div>
          {!reviews?.reviews.length && (
            <p className="text-center text-dark-muted py-8">Hali sharhlar yo'q</p>
          )}
        </section>
      </div>
    </Layout>
  )
}
