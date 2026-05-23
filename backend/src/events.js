// Real-time broadcaster — SSE + Socket.io
const clients = new Map() // id → res (SSE clients)

function addClient(id, res) { clients.set(id, res) }
function removeClient(id) { clients.delete(id) }

function broadcast(event, data) {
  // SSE broadcast (all connected SSE clients)
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const [id, res] of clients) {
    try { res.write(payload) } catch { clients.delete(id) }
  }
  // Socket.io broadcast (all rooms)
  try {
    const { socketBroadcast } = require('./socketServer')
    socketBroadcast(event, data)
  } catch {}
}

function broadcastToBranch(branchId, event, data) {
  if (!branchId) return broadcast(event, data)
  // SSE — send to all (branch filtering not possible with SSE)
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const [id, res] of clients) {
    try { res.write(payload) } catch { clients.delete(id) }
  }
  // Socket.io — targeted branch room + admins room
  try {
    const { socketBroadcastToBranch } = require('./socketServer')
    socketBroadcastToBranch(branchId, event, data)
  } catch {}
}

module.exports = { addClient, removeClient, broadcast, broadcastToBranch }
