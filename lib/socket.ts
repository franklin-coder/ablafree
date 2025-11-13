
'use client'

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    // En producción, conectar al dominio actual
    // En desarrollo, conectar a localhost:3000
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? (typeof window !== 'undefined' ? window.location.origin : '')
      : 'http://localhost:3000'
    
    console.log('🔌 Conectando socket a:', socketUrl)
    
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 60000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socket.on('connect', () => {
      console.log('✅ Socket conectado exitosamente:', socket?.id)
    })

    socket.on('connect_error', (error: Error) => {
      console.error('❌ Error de conexión del socket:', error)
    })

    socket.on('disconnect', (reason: string) => {
      console.log('⚠️ Socket desconectado:', reason)
    })
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
