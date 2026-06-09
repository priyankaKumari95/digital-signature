'use strict';

const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');

const json = (message) => (req, res) =>
  res.status(429).json({ success: false, message });

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: json('Too many requests, please try again later.'),
});

const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: json('Too many authentication attempts, please try again later.'),
});

const verifyLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: json('Too many verification attempts, please try again later.'),
});

module.exports = { apiLimiter, authLimiter, verifyLimiter };
