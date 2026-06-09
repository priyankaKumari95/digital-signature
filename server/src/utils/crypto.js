'use strict';

const crypto = require('crypto');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function generateResetToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = sha256(raw);
  return { raw, hash };
}

function generateVerificationId() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = { sha256, generateResetToken, generateVerificationId };
