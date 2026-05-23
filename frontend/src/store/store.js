import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => { localStorage.setItem('token', token); set({ token }) },
      logout: () => { localStorage.removeItem('token'); set({ user: null, token: null, favoriteIds: [] }) },

      // Cart
      cartCount: 0,
      setCartCount: (n) => set({ cartCount: n }),

      // Favorites (local cache of favorited product IDs)
      favoriteIds: [],
      addFavoriteId: (id) => set(s => ({ favoriteIds: [...new Set([...s.favoriteIds, id])] })),
      removeFavoriteId: (id) => set(s => ({ favoriteIds: s.favoriteIds.filter(f => f !== id) })),

      // Language
      lang: 'uz',
      setLang: (lang) => set({ lang }),

      // UI
      activeTab: 'home',
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    { name: 'mixart-store', partialize: (s) => ({ lang: s.lang, token: s.token, favoriteIds: s.favoriteIds }) }
  )
)
