import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 10000,
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err.response?.data || err)
)

export const authAPI = {
  telegram: (telegram_id, full_name, language = 'uz', referral_code) =>
    api.post('/auth/telegram', null, { params: { telegram_id, full_name, language, referral_code } }),
  me: () => api.get('/auth/me'),
  googleToken: (credential) => api.post('/auth/google', { credential }),
  updateLang: (user_id, language) =>
    api.put(`/users/${user_id}`, { language }),
  updateProfile: (user_id, data) => api.put(`/users/${user_id}`, data),
}

export const productAPI = {
  list: (params) => api.get('/products/', { params }),
  get: (id) => api.get(`/products/${id}`),
  categories: () => api.get('/products/categories'),
  trending: () => api.get('/products/trending'),
  flashSale: () => api.get('/flash-sales/active'),
  toggleFavorite: (id, user_id) => api.post(`/products/${id}/favorite`, null, { params: { user_id } }),
  addReview: (id, data) => api.post(`/products/${id}/review`, null, { params: data }),
  getFavorites: (user_id) => api.get('/products/', { params: { favorites_of: user_id } }),
}

export const cartAPI = {
  get: (user_id) => api.get(`/cart/${user_id}`),
  add: (user_id, data) => api.post(`/cart/${user_id}/add`, null, { params: data }),
  update: (user_id, item_id, quantity) =>
    quantity < 1
      ? api.delete(`/cart/${user_id}/item/${item_id}`)
      : api.patch(`/cart/${user_id}/item/${item_id}`, null, { params: { quantity } }),
  remove: (user_id, item_id) => api.delete(`/cart/${user_id}/item/${item_id}`),
  clear: (user_id) => api.delete(`/cart/${user_id}/clear`),
}

export const orderAPI = {
  create: (data) => api.post('/orders/', data),
  list: (params) => api.get('/orders/', { params }),
  get: (id) => api.get(`/orders/${id}`),
  cancel: (id) => api.patch(`/orders/${id}/status`, null, { params: { new_status: 'cancelled' } }),
}

export const loyaltyAPI = {
  get: (user_id) => api.get(`/users/${user_id}/loyalty`),
  checkPromo: (code) => api.get(`/promo/check/${code}`),
}

export const systemAPI = {
  currencyRate: () => api.get('/system/currency-rate'),
  settings: () => api.get('/system/'),
}

export const aiAPI = {
  chat: (message, user_id, role = 'customer') =>
    api.post('/ai/chat', { message, user_id, role }),
  transcribe: (formData) =>
    api.post('/ai/transcribe', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 }),
  clearSession: (user_id, role = 'customer') =>
    api.post('/ai/clear-session', { user_id, role }),
}

export const paymentAPI = {
  createLink: (order_id, method) =>
    api.post('/payments/create-link', { order_id, method }),
  status: (order_id) => api.get(`/payments/status/${order_id}`),
}

export const notificationAPI = {
  list: (user_id) => api.get(`/notifications/user/${user_id}`),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  send: (title, body, user_id) =>
    api.post('/notifications/send', null, { params: { title, body, user_id } }),
  unreadCount: (user_id) => api.get(`/notifications/unread/${user_id}`),
}

export const reviewAPI = {
  add: (product_id, user_id, rating, comment) =>
    api.post(`/products/${product_id}/review`, null, { params: { user_id, rating, comment } }),
}

export const uploadAPI = {
  image: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/products/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export default api
