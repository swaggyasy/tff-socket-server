require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://projecttff-80675.web.app',
    'https://projecttff-80675.firebaseapp.com'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false
}));

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://projecttff-80675.web.app',
      'https://projecttff-80675.firebaseapp.com'
    ],
    methods: ['GET', 'POST'],
    credentials: false
  },
  transports: ['polling', 'websocket']
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-admin-room', () => {
    socket.join('admin-room');
    console.log(`Socket ${socket.id} joined the admin room.`);
  });

  socket.on('join-user-room', (userId) => {
    socket.join(userId);
    console.log(`Socket ${socket.id} joined room for user ${userId}.`);
  });

  socket.on('order-status-update', (data) => {
    const targetRoom = data.isAdminUpdate ? 'admin-room' : data.userId;
    if (targetRoom) {
      io.to(targetRoom).emit('order-updated', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start the server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 