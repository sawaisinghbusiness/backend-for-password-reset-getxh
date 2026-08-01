const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorHandler');

const app = express();

// Enable trust proxy for reverse proxies (Nginx, Railway, Vercel, Cloudflare) for accurate IP rate limiting & HTTPS
app.set('trust proxy', 1);

// Security Headers via Helmet
app.use(helmet());

// Allowed origins for CORS (GETXH production domains + CLIENT_URL env + localhost dev)
const allowedOrigins = [
  'https://getxh.in',
  'https://www.getxh.in',
  process.env.CLIENT_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests or allowed domains
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: origin ${origin} is not allowed.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

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
