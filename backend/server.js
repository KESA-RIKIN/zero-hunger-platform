console.log("🔥 server.js started");
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
require('./config/firebaseConfig'); // Initialize Firebase (Placeholder)

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Global Request Logger
app.use((req, res, next) => {
    console.log(`📝 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Placeholder Routes
app.get('/', (req, res) => {
    res.send('Zero Hunger Platform Backend is running');
});

app.use('/api/donations', require('./routes/donationRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('🔥 [Global Error Handler] Uncaught Exception:', err);
    console.error(err.stack);
    res.status(500).json({
        message: 'Internal Server Error',
        error: err.message,
        path: req.path
    });
});
// app.use('/api/auth', require('./routes/authRoutes'));

// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/donations', require('./routes/donationRoutes'));

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (error) => {
    console.error('🔥 Server Startup Error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
    }
});
