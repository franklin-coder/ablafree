const { createServer } = require('http');
const { Server } = require('socket.io');

const port = process.env.PORT || 3001;

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket.IO Server Running');
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store active sessions with language info
const activeSessions = new Map();
const sessionLanguages = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-session', (sessionId) => {
    console.log(`Client ${socket.id} joining session: ${sessionId}`);

    // Leave any previous rooms
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });

    // Join the new session room
    socket.join(sessionId);

    // Track active sessions
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, new Set());
    }
    activeSessions.get(sessionId).add(socket.id);

    // Notify others in the session
    socket.to(sessionId).emit('user-joined', {
      userId: socket.id,
      sessionId
    });

    console.log(`Active sessions: ${activeSessions.size}`);
  });

  socket.on('set-language', ({ language }) => {
    console.log(`Client ${socket.id} set language to: ${language}`);
    sessionLanguages.set(socket.id, language);
  });

  socket.on('audio-stream', (data) => {
    const sessionId = Array.from(socket.rooms).find(room => room !== socket.id);
    if (sessionId) {
      socket.to(sessionId).emit('audio-stream', {
        audio: data.audio,
        fromUser: socket.id
      });
    }
  });

  socket.on('transcription', (data) => {
    const sessionId = Array.from(socket.rooms).find(room => room !== socket.id);
    if (sessionId) {
      const language = sessionLanguages.get(socket.id) || 'unknown';
      socket.to(sessionId).emit('transcription', {
        text: data.text,
        fromUser: socket.id,
        language: language,
        timestamp: Date.now()
      });
    }
  });

  socket.on('translation', (data) => {
    const sessionId = Array.from(socket.rooms).find(room => room !== socket.id);
    if (sessionId) {
      socket.to(sessionId).emit('translation', {
        text: data.text,
        fromUser: socket.id,
        targetLanguage: data.targetLanguage,
        timestamp: Date.now()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Clean up session tracking
    activeSessions.forEach((users, sessionId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        if (users.size === 0) {
          activeSessions.delete(sessionId);
        }
        
        // Notify others in the session
        io.to(sessionId).emit('user-left', {
          userId: socket.id,
          sessionId
        });
      }
    });

    // Clean up language tracking
    sessionLanguages.delete(socket.id);
  });
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Socket.IO server running on port ${port}`);
});
