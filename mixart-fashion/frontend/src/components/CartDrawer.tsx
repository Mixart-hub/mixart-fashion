import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useCart } from '../store/cart'
import PriceDisplay from './ui/PriceDisplay'
import Button from './ui/Button'

interface Props { open: boolean; onClose: () => void }

export default function CartDrawer({ open, onClose }: Props) {
  const { t, i18n } = useTranslation()
  const { cart, totalItems, totalPrice, updateItem, removeItem, loading } = useCart()
  const lang = i18n.language as 'uz' | 'ru' | 'en'

  return (
    <>
      {open && <div className="fixed inset-0 bg-dark/40 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl
                      flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-cream">
          <h2 className="text-xl font-serif font-semibold">{t('cart.title')} ({totalItems})</h2>
          <button onClick={onClose} className="text-dark-muted hover:text-dark">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!cart?.items.length ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <span className="text-5xl">🛍</span>
              <p className="text-dark-muted">{t('cart.empty_desc')}</p>
              <Button variant="outline" onClick={onClose}>{t('cart.continue')}</Button>
            </div>
          ) : cart.items.map(item => {
            const nameKey = { uz: 'nameUz', ru: 'nameRu', en: 'nameEn' }[lang]
            const name = (item.product as any)[nameKey] || item.product.name
            const image = item.product.images?.[0] || '/placeholder.jpg'

            return (
              <div key={item.id} className="flex gap-3 p-3 rounded-xl border border-cream">
                <img src={image} alt={name} className="w-16 h-20 object-cover rounded-lg bg-cream-light" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark line-clamp-2">{name}</p>
                  {item.size && <p className="text-xs text-dark-muted mt-0.5">Razmer: {item.size}</p>}
                  {item.color && <p className="text-xs text-dark-muted">Rang: {item.color}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateItem(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full border border-cream flex items-center justify-center hover:bg-cream text-sm font-bold">
                        −
                      </button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateItem(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full border border-cream flex items-center justify-center hover:bg-cream text-sm font-bold">
                        +
                      </button>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 text-xs">
                      {t('cart.remove')}
                    </button>
                  </div>
                  <PriceDisplay price={item.product.price * item.quantity} className="mt-1" />
                </div>
              </div>
            )
          })}
        </div>

        {!!cart?.items.length && (
          <div className="p-5 border-t border-cream space-y-3">
            <div className="flex justify-between font-semibold text-lg">
              <span>{t('cart.total')}</span>
              <PriceDisplay price={totalPrice} />
            </div>
            <Link to="/checkout" onClick={onClose}>
              <Button className="w-full" size="lg">{t('cart.checkout')}</Button>
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
