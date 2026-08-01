const app = require('./app');
const env = require('./config/env');
const { logger } = require('./utils/logger');

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 GETXH Password Reset Backend Service running on port ${env.PORT} [Environment: ${env.NODE_ENV}]`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', { error: err.message, stack: err.stack });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
  process.exit(1);
});

module.exports = server;
