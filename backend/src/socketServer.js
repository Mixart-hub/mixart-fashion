const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

let io = null

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        process.env.ADMIN_URL    || 'http://localhost:3001',
        'http://localhost:3000',
        'http://localhost:3001',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // Optional JWT auth — skip if no token, still allow connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token
    if (token) {
      try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET)
      } catch {}
    }
    next()
  })

  io.on('connection', socket => {
    // Auto-join branch room if authenticated staff
    if (socket.user?.branch_id) {
      socket.join(`branch_${socket.user.branch_id}`)
    }
    // Admin sees all — join global admin room
    if (['admin', 'super_admin'].includes(socket.user?.role)) {
      socket.join('admins')
    }

    // Client can explicitly join a branch room (e.g., after login)
    socket.on('join_branch', (branchId) => {
      if (branchId) socket.join(`branch_${branchId}`)
    })

    socket.on('disconnect', () => {})
  })

  return io
}

function getIO() { return io }

function socketBroadcast(event, data) {
  if (io) io.emit(event, data)
}

function socketBroadcastToBranch(branchId, event, data) {
  if (io && branchId) {
    io.to(`branch_${branchId}`).emit(event, data)
    io.to('admins').emit(event, data)
  }
}

module.exports = { initSocket, getIO, socketBroadcast, socketBroadcastToBranch }
