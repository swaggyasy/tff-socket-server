require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const httpServer = createServer(app);

// --- ToyyibPay Configuration ---
// IMPORTANT: Replace with your actual ToyyibPay credentials
const TOYYIBPAY_SECRET_KEY = 'oe2t79vv-dn6e-j2nh-6ewr-hw55nhy57h8a';
const TOYYIBPAY_CATEGORY_CODE = 'ikxjkfik';
const TOYYIBPAY_API_URL = 'https://toyyibpay.com/index.php/api';

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

// Add JSON parsing middleware
app.use(express.json());

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

// --- ToyyibPay Bill Creation Endpoint ---
app.post('/api/toyyibpay/create-bill', async (req, res) => {
  try {
    const { fullName, email, phone, amount } = req.body;

    // Validate request body
    if (!fullName || !email || !phone || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const billData = {
      userSecretKey: TOYYIBPAY_SECRET_KEY,
      categoryCode: TOYYIBPAY_CATEGORY_CODE,
      billName: 'FoodApp Order',
      billDescription: `Payment for order by ${fullName}`,
      billPriceSetting: 1, // 1 for fixed price
      billPayorInfo: 1, // 1 to require payor info
      billAmount: Math.round(amount * 100), // Amount in cents
      billReturnUrl: 'https://projecttff-80675.web.app/payment-success',
      billCallbackUrl: `${process.env.SOCKET_SERVER_URL || 'https://your-socket-server.onrender.com'}/api/toyyibpay/callback`,
      billExternalReferenceNo: `ORD-${Date.now()}`,
      billTo: fullName,
      billEmail: email,
      billPhone: phone,
    };

    const response = await fetch(`${TOYYIBPAY_API_URL}/createBill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(billData),
    });

    const result = await response.json();

    if (result && result.length > 0 && result[0].BillCode) {
      res.json({ success: true, billCode: result[0].BillCode });
    } else {
      console.error('ToyyibPay bill creation failed:', result);
      throw new Error('Failed to create ToyyibPay bill');
    }

  } catch (error) {
    console.error('Error creating ToyyibPay bill:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// --- ToyyibPay Callback Endpoint ---
// This is where ToyyibPay sends the payment status
app.post('/api/toyyibpay/callback', (req, res) => {
  try {
    const { billcode, status } = req.body;

    console.log('--- ToyyibPay Callback Received ---');
    console.log('Bill Code:', billcode);
    console.log('Status:', status); // '1' for success, '3' for failed
    console.log('---------------------------------');
    
    // Here you would typically verify the signature and update the database
    // For now, the frontend handles order creation on the success page.
    
    res.status(200).send('OK');

  } catch (error) {
    console.error('Error handling ToyyibPay callback:', error);
    res.status(500).send('Internal Server Error');
  }
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