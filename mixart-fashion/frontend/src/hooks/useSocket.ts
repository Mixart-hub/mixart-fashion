import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '../store/auth'

export function useSocket(
  events: Record<string, (data: unknown) => void>
) {
  const { user, token } = useAuth()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token || !user) return

    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001', {
      query: { userId: user.id }
    })
    socketRef.current = socket

    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => { socket.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id])

  return socketRef
}
