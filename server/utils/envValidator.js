const { logger } = require('./logger');

const isMongoUriValid = (value = '') => {
  return value.startsWith('mongodb://') || value.startsWith('mongodb+srv://');
};

/**
 * Validate required environment variables
 */
const validateEnv = () => {
  const mongoUri = (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
  const required = [
    'JWT_SECRET',
    'PORT'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (!mongoUri) {
    missing.unshift('MONGODB_URI|MONGO_URI');
  }
  
  if (missing.length > 0) {
    logger.error('Missing required environment variables:', { missing });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET should be at least 32 characters long for security');
  }

  // Validate MongoDB URI format
  if (!isMongoUriValid(mongoUri)) {
    logger.error('Invalid MongoDB URI format');
    throw new Error('MONGODB_URI or MONGO_URI must start with mongodb:// or mongodb+srv://');
  }

  logger.info('Environment variables validated successfully');
};

module.exports = { validateEnv };
