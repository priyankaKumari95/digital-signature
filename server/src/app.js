'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const { config } = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.use(mongoSanitize());
  app.use(hpp());

  if (!config.isTest) {
    app.use(morgan(config.isProd ? 'combined' : 'dev'));
  }

  app.use('/api', apiLimiter);

  app.use('/api', routes);

  app.get('/', (req, res) => {
    res.json({
      success: true,
      name: 'Digital Signature & Document Management API',
      version: '1.0.0',
      docs: '/api/health',
    });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
