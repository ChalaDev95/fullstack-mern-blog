const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const { requestLogger } = require('./utils/logger');
const { globalErrorHandler, notFound } = require('./utils/errorHandler');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');

const createApp = () => {
  const app = express();

  // Basic middleware
  app.use(helmet());
  app.use(compression());
  app.use(mongoSanitize());
  app.use(requestLogger);

  // CORS
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

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
