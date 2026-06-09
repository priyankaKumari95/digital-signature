'use strict';

const { config } = require('../config/env');

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const activeLevel = config.isTest ? levels.error : levels.debug;

function emit(level, args) {
  if (levels[level] > activeLevel) return;
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  // eslint-disable-next-line no-console
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(prefix, ...args);
}

module.exports = {
  error: (...args) => emit('error', args),
  warn: (...args) => emit('warn', args),
  info: (...args) => emit('info', args),
  debug: (...args) => emit('debug', args),
};
