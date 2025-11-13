// Sistema de almacenamiento en memoria para conversaciones
export interface Message {
  id: string
  sessionId: string
  speaker: 'cliente' | 'cajero'
  originalText: string
  originalLang: string
  translatedText: string
  translatedLang: string
  audioBase64?: string
  timestamp: Date
}

class InMemoryDB {
  private messages: Map<string, Message[]> = new Map()

  // Guardar un mensaje
  saveMessage(message: Omit<Message, 'id' | 'timestamp'>): Message {
    const newMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }

    const sessionMessages = this.messages.get(message.sessionId) || []
    sessionMessages.push(newMessage)
    this.messages.set(message.sessionId, sessionMessages)

    return newMessage
  }

  // Obtener mensajes de una sesión
  getMessages(sessionId: string, since?: Date): Message[] {
    const messages = this.messages.get(sessionId) || []
    
    if (since) {
      return messages.filter(msg => msg.timestamp > since)
    }
    
    return messages
  }

  // Limpiar mensajes de una sesión
  clearSession(sessionId: string): void {
    this.messages.delete(sessionId)
  }

  // Obtener todas las sesiones activas
  getAllSessions(): string[] {
    return Array.from(this.messages.keys())
  }
}

// Singleton global
const globalForDB = globalThis as unknown as {
  db: InMemoryDB | undefined
}

export const db = globalForDB.db ?? new InMemoryDB()

if (process.env.NODE_ENV !== 'production') {
  globalForDB.db = db
}
