
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = dev ? 'localhost' : '0.0.0.0'
const port = process.env.PORT || 3000
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  })

  // Store active sessions
  const activeSessions = new Map()

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('join-session', (sessionId) => {
      console.log(`Client ${socket.id} joining session: ${sessionId}`)
      
      // Leave any previous rooms
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.leave(room)
        }
      })

      // Join the new session room
      socket.join(sessionId)
      
      // Track active sessions
      if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, new Set())
      }
      activeSessions.get(sessionId).add(socket.id)

      // Notify others in the session
      socket.to(sessionId).emit('user-joined', {
        socketId: socket.id,
        sessionId: sessionId,
        timestamp: new Date()
      })

      console.log(`Session ${sessionId} now has ${activeSessions.get(sessionId).size} participants`)
    })

    socket.on('send-message', (data) => {
      const audioSizeKB = data.audioBase64 
        ? (data.audioBase64.length * 0.75 / 1024).toFixed(2) 
        : '0';
      
      console.log(`📤 Message from ${data.speaker} in session ${data.sessionId} (Audio: ${audioSizeKB} KB)`)
      
      // Count recipients
      const roomSize = io.sockets.adapter.rooms.get(data.sessionId)?.size || 0
      const recipientCount = roomSize - 1 // Exclude sender
      
      console.log(`   └─> Broadcasting to ${recipientCount} recipient(s)`)
      
      // Broadcast to all other clients in the same session
      socket.to(data.sessionId).emit('message-received', {
        originalText: data.originalText,
        translatedText: data.translatedText,
        speaker: data.speaker,
        audioBase64: data.audioBase64,
        timestamp: data.timestamp,
        sessionId: data.sessionId
      })
      
      console.log(`   ✓ Broadcast complete`)
    })

    // Handle language updates
    socket.on('language-update', (data) => {
      console.log(`Language update in session ${data.sessionId}: ${data.speaker} -> ${data.language}`)
      
      // Broadcast language change to all clients in the session (including sender)
      io.to(data.sessionId).emit('language-changed', {
        language: data.language,
        speaker: data.speaker,
        sessionId: data.sessionId
      })
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
      
      // Remove from all active sessions
      activeSessions.forEach((participants, sessionId) => {
        if (participants.has(socket.id)) {
          participants.delete(socket.id)
          if (participants.size === 0) {
            activeSessions.delete(sessionId)
          } else {
            // Notify remaining participants
            socket.to(sessionId).emit('user-left', {
              socketId: socket.id,
              sessionId: sessionId,
              timestamp: new Date()
            })
          }
        }
      })
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })
  })

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> Environment: ${dev ? 'development' : 'production'}`)
      console.log('✅ Socket.io server is running')
    })
})
