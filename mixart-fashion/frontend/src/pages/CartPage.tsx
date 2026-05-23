import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCart } from '../store/cart'
import Layout from '../components/Layout'
import Breadcrumb from '../components/ui/Breadcrumb'
import PriceDisplay from '../components/ui/PriceDisplay'
import Button from '../components/ui/Button'

export default function CartPage() {
  const { t, i18n } = useTranslation()
  const { cart, updateItem, removeItem, clearCart, totalItems, totalPrice, loading } = useCart()
  const lang = i18n.language as 'uz' | 'ru' | 'en'

  if (!cart?.items.length) return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-6xl mb-6">🛍</p>
        <h2 className="text-2xl font-serif font-semibold mb-3">{t('cart.empty')}</h2>
        <p className="text-dark-muted mb-8">{t('cart.empty_desc')}</p>
        <Link to="/products"><Button size="lg">{t('cart.continue')}</Button></Link>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('cart.title') }]} />
        <div className="flex items-center justify-between mb-8">
          <h1 className="section-title">{t('cart.title')} ({totalItems})</h1>
          <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-600 transition-colors">
            {t('cart.clear')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map(item => {
              const nameMap = { uz: item.product.nameUz, ru: item.product.nameRu, en: item.product.nameEn }
              const name = nameMap[lang] || item.product.name
              return (
                <div key={item.id} className="card p-4 flex gap-4">
                  <Link to={`/products/${item.productId}`}>
                    <img src={item.product.images?.[0] || '/placeholder.jpg'} alt={name}
                      className="w-24 h-32 object-cover rounded-xl bg-cream-light" />
                  </Link>
                  <div className="flex-1">
                    <Link to={`/products/${item.productId}`}>
                      <h3 className="font-medium text-dark hover:text-rose transition-colors">{name}</h3>
                    </Link>
                    <div className="flex gap-3 mt-1">
                      {item.size && <span className="badge badge-rose">Razmer: {item.size}</span>}
                      {item.color && <span className="badge badge-rose">Rang: {item.color}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateItem(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border border-cream flex items-center justify-center hover:bg-cream font-bold">−</button>
                        <span className="font-semibold w-8 text-center">{item.quantity}</span>
                        <button onClick={() => updateItem(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border border-cream flex items-center justify-center hover:bg-cream font-bold">+</button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 text-sm transition-colors">
                        {t('cart.remove')}
                      </button>
                    </div>
                    <PriceDisplay price={item.product.price * item.quantity} className="mt-2" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Order summary */}
          <div>
            <div className="card p-6 sticky top-24">
              <h2 className="font-serif text-xl font-semibold mb-6">Buyurtma xulosasi</h2>
              <div className="space-y-3 mb-6">
                {cart.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-dark-muted">{item.product.name} × {item.quantity}</span>
                    <PriceDisplay price={item.product.price * item.quantity} />
                  </div>
                ))}
              </div>
              <div className="border-t border-cream pt-4 mb-6">
                <div className="flex justify-between font-semibold text-lg">
                  <span>{t('cart.total')}</span>
                  <PriceDisplay price={totalPrice} />
                </div>
              </div>
              <Link to="/checkout">
                <Button size="lg" className="w-full">{t('cart.checkout')}</Button>
              </Link>
              <Link to="/products" className="block text-center text-sm text-dark-muted hover:text-rose mt-3 transition-colors">
                {t('cart.continue')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
