import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('admin_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(err.response?.data || err)
  }
)

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

export const staffAuthAPI = {
  login: (email, password) => api.post('/staff/login', { email, password }),
  me: () => api.get('/staff/me'),
  orders: (params) => api.get('/staff/orders', { params }),
  updateOrderStatus: (id, new_status) => api.patch(`/staff/orders/${id}/status`, { new_status }),
  assignOrder: (id) => api.patch(`/staff/orders/${id}/assign`, {}),
  inventory: (branch_id) => api.get('/staff/inventory', { params: branch_id ? { branch_id } : {} }),
  dashboard: () => api.get('/staff/dashboard'),
}

export const dashboardAPI = {
  stats: () => api.get('/admin/dashboard'),
  recentOrders: (limit = 5) => api.get('/admin/orders', { params: { limit, page: 1 } }),
  revenue: () => api.get('/admin/stats/revenue'),
  topCategories: () => api.get('/admin/stats/top-categories'),
}

export const ordersAPI = {
  list: (params) => api.get('/admin/orders', { params }),
  update: (id, data) => api.put(`/admin/orders/${id}`, data),
}

export const productsAPI = {
  list: (params) => api.get('/admin/products', { params }),
  create: (data) => api.post('/admin/products', data),
  update: (id, data) => api.put(`/admin/products/${id}`, data),
  remove: (id) => api.delete(`/admin/products/${id}`),
  bulkDelete: (ids) => api.post('/admin/products/bulk-delete', { ids }),
  categories: () => api.get('/products/categories'),
}

export const categoriesAPI = {
  list: () => api.get('/admin/categories'),
  create: (data) => api.post('/admin/categories', data),
  update: (id, data) => api.put(`/admin/categories/${id}`, data),
  remove: (id) => api.delete(`/admin/categories/${id}`),
}

export const discountsAPI = {
  list: () => api.get('/admin/discounts'),
  create: (data) => api.post('/admin/discounts', data),
  update: (id, data) => api.put(`/admin/discounts/${id}`, data),
  remove: (id) => api.delete(`/admin/discounts/${id}`),
}

export const activityAPI = {
  list: (params) => api.get('/admin/activity', { params }),
}

export const marketingAPI = {
  sendPush: (data) => api.post('/admin/push-notification', data),
  newsList: () => api.get('/admin/news'),
  newsCreate: (data) => api.post('/admin/news', data),
  newsUpdate: (id, data) => api.put(`/admin/news/${id}`, data),
  newsDelete: (id) => api.delete(`/admin/news/${id}`),
}

export const uploadAPI = {
  productImage: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const customersAPI = {
  list: (params) => api.get('/admin/customers', { params }),
}

export const inventoryAPI = {
  list: (params) => api.get('/inventory', { params }),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  add: (data) => api.post('/inventory/add', data),
  transfer: (data) => api.post('/inventory/transfer', data),
}

export const staffAPI = {
  list: (params) => api.get('/staff', { params }),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  remove: (id) => api.delete(`/staff/${id}`),
}

export const branchesAPI = {
  list: () => api.get('/admin/branches'),
  create: (data) => api.post('/admin/branches', data),
  update: (id, data) => api.put(`/admin/branches/${id}`, data),
  remove: (id) => api.delete(`/admin/branches/${id}`),
}

export const bannersAPI = {
  list: () => api.get('/admin/banners'),
  create: (data) => api.post('/admin/banners', data),
  update: (id, data) => api.put(`/admin/banners/${id}`, data),
  remove: (id) => api.delete(`/admin/banners/${id}`),
}

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  branches: () => api.get('/settings/branches'),
  createBranch: (data) => api.post('/settings/branches', data),
  promoCodes: () => api.get('/settings/promo-codes'),
  createPromo: (data) => api.post('/settings/promo-codes', data),
  productFields: () => api.get('/settings/product-fields'),
  updateProductFields: (data) => api.put('/settings/product-fields', data),
}

export default api
