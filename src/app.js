const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorHandler');

const app = express();

// Security Headers via Helmet
app.use(helmet());

// CORS configuration
app.use(cors());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'GETXH Password Reset Backend',
    timestamp: new Date().toISOString()
  });
});

// Authentication API Routes
app.use('/api', authRoutes);

// 404 Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

module.exports = app;
