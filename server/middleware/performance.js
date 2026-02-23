const { logger } = require('../utils/logger');

/**
 * Performance monitoring middleware
 * Tracks response times and performance metrics
 */
const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  // Store original res.end
  const originalEnd = res.end;
  
  // Override res.end to capture metrics
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log performance metrics
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime.toFixed(2)}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      contentLength: res.get('Content-Length') || 0
    });
    
    // Add performance headers
    res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
    
    // Call original end
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Memory usage monitoring
 */
const memoryMonitor = () => {
  const memUsage = process.memoryUsage();
  
  logger.info('Memory usage', {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
  });
};

/**
 * Database connection monitoring
 */
const dbMonitor = (mongoose) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  setInterval(() => {
    const state = mongoose.connection.readyState;
    logger.info('Database status', {
      state: states[state],
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    });
  }, 60000); // Check every minute
};

/**
 * API usage statistics
 */
const apiStats = new Map();

const apiUsageTracker = (req, res, next) => {
  const key = `${req.method}:${req.route?.path || req.originalUrl}`;
  
  if (!apiStats.has(key)) {
    apiStats.set(key, {
      count: 0,
      avgResponseTime: 0,
      lastUsed: null
    });
  }
  
  const startTime = process.hrtime.bigint();
  const originalEnd = res.end;
  
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000;
    
    const stats = apiStats.get(key);
    stats.count++;
    stats.avgResponseTime = (stats.avgResponseTime * (stats.count - 1) + responseTime) / stats.count;
    stats.lastUsed = new Date().toISOString();
    
    originalEnd.apply(this, args);
  };
  
  next();
};

const getApiStats = () => {
  return Object.fromEntries(apiStats);
};

/**
 * Health check endpoint data
 */
const healthCheck = async (mongoose) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      host: mongoose.connection.host,
      name: mongoose.connection.name
    },
    api: getApiStats()
  };
  
  // Check if any critical metrics are concerning
  if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
    health.status = 'warning';
    health.warning = 'High memory usage';
  }
  
  if (mongoose.connection.readyState !== 1) {
    health.status = 'error';
    health.error = 'Database disconnected';
  }
  
  return health;
};

module.exports = {
  performanceMonitor,
  memoryMonitor,
  dbMonitor,
  apiUsageTracker,
  getApiStats,
  healthCheck
};
