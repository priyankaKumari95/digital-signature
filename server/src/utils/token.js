'use strict';

const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

function signAccessToken(user) {
  return jwt.sign({ sub: user.id || user._id.toString(), role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

module.exports = { signAccessToken, verifyAccessToken };
