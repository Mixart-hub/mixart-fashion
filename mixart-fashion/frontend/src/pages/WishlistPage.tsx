import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { useToast } from '../store/toast'
import Layout from '../components/Layout'
import Breadcrumb from '../components/ui/Breadcrumb'
import ProductGrid from '../components/ProductGrid'
import LoadingSpinner from '../components/ui/LoadingSpinner'

interface WishlistItem { id: string; product: any }

export default function WishlistPage() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<WishlistItem[]>('/wishlist')
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  const remove = async (productId: string) => {
    await api.delete(`/wishlist/${productId}`)
    setItems(prev => prev.filter(i => i.product.id !== productId))
    showToast("Sevimlilardan o'chirildi", 'info')
  }

  const products = items.map(i => i.product)

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.wishlist') }]} />
        <h1 className="section-title mb-8">{t('nav.wishlist')} ({items.length})</h1>
        {loading ? <LoadingSpinner /> : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">💝</p>
            <p className="text-dark-muted">Sevimli mahsulotlar yo'q</p>
          </div>
        ) : <ProductGrid products={products} cols={4} />}
      </div>
    </Layout>
  )
}
