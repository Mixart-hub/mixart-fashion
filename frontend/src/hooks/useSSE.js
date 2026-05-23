import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')

export default function useSSE(handlers, enabled = true) {
  const socketRef = useRef(null)
  const hndlRef   = useRef(handlers)
  hndlRef.current = handlers

  useEffect(() => {
    if (!enabled) return

    const token = localStorage.getItem('token')
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 3000,
      auth: token ? { token } : {},
    })
    socketRef.current = socket

    const bound = {}
    Object.keys(hndlRef.current).forEach(event => {
      const cb = (data) => hndlRef.current[event]?.(data)
      bound[event] = cb
      socket.on(event, cb)
    })

    return () => {
      Object.entries(bound).forEach(([event, cb]) => socket.off(event, cb))
      socket.disconnect()
    }
  }, [enabled])
}
