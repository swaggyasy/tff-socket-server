require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Get allowed origins from environment variable or use defaults
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : 
  ['http://localhost:3000', 'https://projecttff-80675.web.app', 'https://projecttff-80675.firebaseapp.com'];

// Configure CORS
app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false
}));

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
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
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log('Allowed origins:', ALLOWED_ORIGINS);
}); 