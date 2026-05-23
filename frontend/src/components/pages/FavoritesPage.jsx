import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { productAPI } from '../../services/api'
import { useStore } from '../../store/store'
import ProductCard from '../common/ProductCard'

const TXT = {
  uz: { title: 'Sevimlilar', empty: 'Sevimlilar ro\'yxati bo\'sh', shop: 'Xarid qilish', loading: 'Yuklanmoqda...' },
  ru: { title: 'Избранное', empty: 'Список избранного пуст', shop: 'Купить', loading: 'Загрузка...' },
  en: { title: 'Favorites', empty: 'Favorites list is empty', shop: 'Shop', loading: 'Loading...' },
}

export default function FavoritesPage() {
  const nav = useNavigate()
  const { user, lang } = useStore()
  const tx = TXT[lang] || TXT.uz
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    productAPI.getFavorites(user.id)
      .then(r => setFavorites(r.items || r || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  async function toggleFav(productId) {
    if (!user?.id) return
    await productAPI.toggleFavorite(productId, user.id).catch(() => {})
    setFavorites(prev => prev.filter(p => p.id !== productId))
  }

  return (
    <div>
      <div style={{ background: '#1C1C1E', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>❤️ {tx.title}</span>
      </div>

      <div style={{ padding: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>❤️</div>
            {tx.loading}
          </div>
        ) : favorites.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🤍</div>
            <div style={{ color: '#6B7280', marginBottom: 16 }}>{tx.empty}</div>
            <button onClick={() => nav('/catalog')} style={{
              background: '#C9956C', color: '#fff', border: 'none',
              borderRadius: 12, padding: '11px 28px', cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}>{tx.shop}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {favorites.map(product => (
              <div key={product.id} style={{ position: 'relative' }}>
                <ProductCard product={product} style={{ width: '100%' }} />
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFav(product.id) }}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#fff', border: 'none',
                    fontSize: 14, cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >❤️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

