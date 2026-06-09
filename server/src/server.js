'use strict';

const fs = require('fs');
const createApp = require('./app');
const { connectDB } = require('./config/db');
const { config, assertProductionConfig } = require('./config/env');
const logger = require('./utils/logger');

async function start() {
  assertProductionConfig();

  fs.mkdirSync(config.uploads.dir, { recursive: true });

  await connectDB();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`API listening on ${config.serverUrl} (env: ${config.env})`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
