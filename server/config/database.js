const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

// Prevent deprecated option warnings and keep behaviour explicit
mongoose.set('strictQuery', true);
mongoose.set('autoIndex', process.env.NODE_ENV !== 'production');

const redactUri = (uri = '') => uri.replace(/\/\/.*@/, '//***:***@');

const attachConnectionLogging = () => {
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
};

const connectDB = async (options = {}) => {
  const mongoURI = (process.env.MONGODB_URI || 'mongodb://localhost:27017/cms').trim();

  if (!mongoURI) {
    throw new Error('MongoDB connection string is missing. Set MONGODB_URI in your environment.');
  }

  const {
    maxPoolSize = parseInt(process.env.MONGO_MAX_POOL_SIZE || '10', 10),
    minPoolSize = parseInt(process.env.MONGO_MIN_POOL_SIZE || '2', 10),
    serverSelectionTimeoutMS = parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '10000', 10),
    socketTimeoutMS = parseInt(process.env.MONGO_SOCKET_TIMEOUT || '45000', 10),
    connectTimeoutMS = parseInt(process.env.MONGO_CONNECT_TIMEOUT || '10000', 10),
    heartbeatFrequencyMS = parseInt(process.env.MONGO_HEARTBEAT_FREQUENCY || '10000', 10),
    maxIdleTimeMS = parseInt(process.env.MONGO_MAX_IDLE_TIME || '30000', 10)
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
    } catch (err) {
      const retryCount = parseInt(process.env.MONGO_MAX_RETRIES || '5', 10);
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

  await attemptConnection();
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
