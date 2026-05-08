require('dotenv').config();

const { createApp } = require('./app');
const { connectDB, disconnectDB } = require('./config/database');
const { logger } = require('./utils/logger');
const { validateEnv } = require('./utils/envValidator');

// Validate environment variables early
validateEnv();

const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  try {
    await connectDB();
    const app = createApp();

    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      logger.info(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

const shutdown = async (signal, exitCode = 0) => {
  logger.warn(`${signal} received. Closing server and database connections...`);

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      logger.info('HTTP server closed');
    }

    await disconnectDB();
  } catch (err) {
    logger.error('Error during shutdown', { error: err.message });
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection', { error: err.message, stack: err.stack });
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  shutdown('uncaughtException', 1);
});

startServer();


