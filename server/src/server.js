import './loadEnv.js';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { initSocket } from './config/socket.js';

// Route Imports
import authRoutes from './routes/auth.js';
import commuterRoutes from './routes/routes.js';
import matchRoutes from './routes/matches.js';
import rideRoutes from './routes/rides.js';

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize real-time web sockets
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/routes', commuterRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/rides', rideRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'DailyPool Server is healthy.' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`DailyPool Backend Server running on port ${PORT}`);
});
