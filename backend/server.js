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

// Placeholder Routes
app.get('/', (req, res) => {
    res.send('Zero Hunger Platform Backend is running');
});

app.use('/api/donations', require('./routes/donationRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
// app.use('/api/auth', require('./routes/authRoutes'));

// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/donations', require('./routes/donationRoutes'));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
