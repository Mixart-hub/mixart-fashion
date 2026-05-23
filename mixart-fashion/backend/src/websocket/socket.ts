import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'

let io: Server

export function initWebSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true }
  })

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string
    if (userId) socket.join(`user:${userId}`)

    socket.on('disconnect', () => {})
  })
}

export function emitToUser(userId: string, event: string, data: unknown) {
  io?.to(`user:${userId}`).emit(event, data)
}

export function emitToAll(event: string, data: unknown) {
  io?.emit(event, data)
}
