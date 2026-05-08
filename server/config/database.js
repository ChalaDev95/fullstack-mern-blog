const fs = require('fs');
const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

// Prevent deprecated option warnings and keep behaviour explicit
mongoose.set('strictQuery', true);
mongoose.set('autoIndex', process.env.NODE_ENV !== 'production');

const redactUri = (uri = '') => uri.replace(/\/\/.*@/, '//***:***@');

let connectionLoggingAttached = false;
let connectionPromise;

const parseMongoOption = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const isRunningInContainer = () => {
  if (process.env.RUNNING_IN_DOCKER === 'true') {
    return true;
  }

  return fs.existsSync('/.dockerenv');
};

const normalizeMongoUri = (uri = '') => String(uri).trim();

const getMongoUri = () => {
  const primaryUri = normalizeMongoUri(process.env.MONGODB_URI);
  const alternateUri = normalizeMongoUri(process.env.MONGO_URI);
  const fallbackUri = 'mongodb://127.0.0.1:27017/cms';

  if (!primaryUri) {
    return alternateUri || fallbackUri;
  }

  try {
    const { hostname } = new URL(primaryUri);

    if (hostname === 'mongodb' && !isRunningInContainer()) {
      return alternateUri || fallbackUri;
    }
  } catch (error) {
    logger.warn('MongoDB URI could not be parsed cleanly; using configured value', {
      error: error.message
    });
  }

  return primaryUri;
};

const attachConnectionLogging = () => {
  if (connectionLoggingAttached) {
    return;
  }

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Will attempt to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });

  connectionLoggingAttached = true;
};

const connectDB = async (options = {}) => {
  const mongoURI = getMongoUri();

  if (!mongoURI) {
    throw new Error('MongoDB connection string is missing. Set MONGODB_URI or MONGO_URI in your environment.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const {
    maxPoolSize = parseMongoOption(process.env.MONGO_MAX_POOL_SIZE, 10),
    minPoolSize = parseMongoOption(process.env.MONGO_MIN_POOL_SIZE, 2),
    serverSelectionTimeoutMS = parseMongoOption(process.env.MONGO_SERVER_SELECTION_TIMEOUT, 10000),
    socketTimeoutMS = parseMongoOption(process.env.MONGO_SOCKET_TIMEOUT, 45000),
    connectTimeoutMS = parseMongoOption(process.env.MONGO_CONNECT_TIMEOUT, 10000),
    heartbeatFrequencyMS = parseMongoOption(process.env.MONGO_HEARTBEAT_FREQUENCY, 10000),
    maxIdleTimeMS = parseMongoOption(process.env.MONGO_MAX_IDLE_TIME, 30000),
    retryCount = parseMongoOption(process.env.MONGO_MAX_RETRIES, 5)
  } = options;

  attachConnectionLogging();

  const attemptConnection = async (attempt = 1) => {
    try {
      await mongoose.connect(mongoURI, {
        maxPoolSize,
        minPoolSize,
        serverSelectionTimeoutMS,
        socketTimeoutMS,
        connectTimeoutMS,
        heartbeatFrequencyMS,
        maxIdleTimeMS,
        retryWrites: true, // Enable retryable writes for reliability
        retryReads: true, // Enable retryable reads for reliability
        family: 4 // IPv4 avoids occasional DNS/IP issues on dual-stack hosts
      });
      logger.info(`MongoDB connected at ${redactUri(mongoURI)}`);
      return mongoose.connection;
    } catch (err) {
      const backoffMs = Math.min(30000, attempt * 3000);
      logger.warn('MongoDB connection attempt failed', {
        attempt,
        retryCount,
        delay: `${backoffMs}ms`,
        error: err.message
      });

      if (attempt >= retryCount) {
        logger.error('Exhausted MongoDB reconnect attempts');
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return attemptConnection(attempt + 1);
    }
  };

  connectionPromise = attemptConnection();

  try {
    await connectionPromise;
    return mongoose.connection;
  } finally {
    connectionPromise = undefined;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }
};

module.exports = {
  connectDB,
  disconnectDB
};
