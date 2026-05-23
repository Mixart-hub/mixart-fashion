import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { initWebSocket } from './websocket/socket'
import { errorHandler } from './middleware/error.middleware'
import authRoutes from './routes/auth.routes'
import productRoutes from './routes/products.routes'
import orderRoutes from './routes/orders.routes'
import paymentRoutes from './routes/payments.routes'
import adminRoutes from './routes/admin.routes'
import telegramRoutes from './routes/telegram.routes'
import cartRoutes from './routes/cart.routes'
import categoryRoutes from './routes/categories.routes'
import reviewRoutes from './routes/reviews.routes'
import notificationRoutes from './routes/notifications.routes'
import loyaltyRoutes from './routes/loyalty.routes'
import inventoryRoutes from './routes/inventory.routes'
import wishlistRoutes from './routes/wishlist.routes'
import searchRoutes from './routes/search.routes'

const app = express()
const httpServer = createServer(app)

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/telegram', telegramRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/loyalty', loyaltyRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/search', searchRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok', version: '2.0.0' }))

app.use(errorHandler)

initWebSocket(httpServer)

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => console.log(`Mixart Fashion API on :${PORT}`))

export default app
