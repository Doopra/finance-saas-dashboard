const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./database');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const statementRoutes = require('./routes/statements');
const insightRoutes = require('./routes/insights');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend
app.use(cors({
  origin: '*', // for easy local development and cross-testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-gemini-key']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create public static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/insights', insightRoutes);

// Root check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', database: 'connected', port: PORT });
});

module.exports = app;
