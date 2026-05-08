const express = require('express');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const { requestLogger } = require('./utils/logger');
const { globalErrorHandler, notFound } = require('./utils/errorHandler');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');

const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_PATH || 'uploads');
const clientBuildDir = path.resolve(__dirname, 'public');

const getAllowedOrigins = () => {
  const configuredOrigins = process.env.FRONTEND_URL || 'http://localhost:3000';
  const origins = configuredOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Always allow localhost variants in development
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  return Array.from(new Set(origins));
};

const createApp = () => {
  const app = express();
  // Read allowed origins inside createApp so dotenv has already loaded
  const allowedOrigins = getAllowedOrigins();

  // Basic middleware
  app.use(helmet({
    // Allow PDFs and media to be displayed inline in the browser
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  app.use(compression());
  app.use(mongoSanitize());
  app.use(cookieParser());
  app.use(requestLogger);

  // CORS
  app.use(cors({
    origin(origin, callback) {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Return a proper error string — not an Error object — so it becomes 403 not 500
      return callback(null, false);
    },
    credentials: true
  }));

  // Rate limiting
  app.use('/api/', generalLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/posts', require('./routes/posts'));
  app.use('/api/pages', require('./routes/pages'));
  app.use('/api/comments', require('./routes/comments'));
  app.use('/api/media', require('./routes/media'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/categories', require('./routes/categories'));
  app.use('/api/tags', require('./routes/tags'));
  app.use('/api/search', require('./routes/search'));
  app.use('/api/sitemap', require('./routes/sitemap'));
  app.use('/api/likes', require('./routes/likes'));

  // Serve uploaded files — set Content-Disposition: inline for PDFs so
  // the browser renders them rather than forcing a download
  app.use('/uploads', (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
    next();
  }, express.static(uploadDir));

  if (fs.existsSync(clientBuildDir)) {
    app.use(express.static(clientBuildDir));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next();
      }

      return res.sendFile(path.join(clientBuildDir, 'index.html'));
    });
  }

  // Basic health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
  });

  // 404 and global error handlers
  app.use(notFound);
  app.use(globalErrorHandler);

  return app;
};

module.exports = { createApp };
