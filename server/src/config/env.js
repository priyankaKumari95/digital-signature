'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const NODE_ENV = process.env.NODE_ENV || 'development';
const isTest = NODE_ENV === 'test';
const isProd = NODE_ENV === 'production';

const config = {
  env: NODE_ENV,
  isTest,
  isProd,
  isDev: NODE_ENV === 'development',

  port: toInt(process.env.PORT, 5000),

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digital_signature',

  jwt: {
    secret: process.env.JWT_SECRET || (isProd ? undefined : 'dev-insecure-jwt-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    resetSecret:
      process.env.JWT_RESET_SECRET ||
      (isProd ? undefined : 'dev-insecure-reset-secret-change-me'),
    resetExpiresIn: process.env.JWT_RESET_EXPIRES_IN || '30m',
  },

  bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 12),

  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  serverUrl: (process.env.SERVER_URL || `http://localhost:${toInt(process.env.PORT, 5000)}`).replace(
    /\/$/,
    ''
  ),

  uploads: {
    dir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
    maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE_MB, 15) * 1024 * 1024,
  },

  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_MAX, 300),
    authMax: toInt(process.env.AUTH_RATE_LIMIT_MAX, 30),
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: toInt(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Digital Signature <no-reply@digisign.local>',
  },
};

function assertProductionConfig() {
  if (!isProd) return;
  const missing = [];
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.JWT_RESET_SECRET) missing.push('JWT_RESET_SECRET');
  if (!process.env.MONGO_URI) missing.push('MONGO_URI');
  if (missing.length) {
    throw new Error(
      `Missing required environment variables in production: ${missing.join(', ')}`
    );
  }
}

module.exports = { config, assertProductionConfig };
