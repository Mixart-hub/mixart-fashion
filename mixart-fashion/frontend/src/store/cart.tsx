import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { api } from '../api/client'

interface CartProduct {
  id: string; name: string; nameUz: string; nameRu: string; nameEn: string
  price: number; images: string[]; stock: number
}
interface CartItem {
  id: string; productId: string; quantity: number; size?: string; color?: string
  product: CartProduct
}
interface Cart { id: string; items: CartItem[] }

interface CartCtx {
  cart: Cart | null
  loading: boolean
  fetchCart: () => Promise<void>
  addItem: (productId: string, quantity?: number, size?: string, color?: string) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartCtx | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchCart = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      setLoading(true)
      const data = await api.get('/cart')
      setCart(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  const addItem = async (productId: string, quantity = 1, size?: string, color?: string) => {
    const data = await api.post('/cart/items', { productId, quantity, size, color })
    setCart(data)
  }

  const updateItem = async (itemId: string, quantity: number) => {
    const data = await api.patch(`/cart/items/${itemId}`, { quantity })
    setCart(data)
  }

  const removeItem = async (itemId: string) => {
    const data = await api.delete(`/cart/items/${itemId}`)
    setCart(data)
  }

  const clearCart = async () => {
    await api.delete('/cart')
    setCart(prev => prev ? { ...prev, items: [] } : null)
  }

  const totalItems = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0
  const totalPrice = cart?.items.reduce((s, i) => s + i.product.price * i.quantity, 0) ?? 0

  return (
    <CartContext.Provider value={{ cart, loading, fetchCart, addItem, updateItem, removeItem, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
