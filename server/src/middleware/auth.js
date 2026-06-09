'use strict';

const { verifyAccessToken } = require('../utils/token');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    throw AppError.unauthorized('Authentication required');
  }
  const token = header.slice(7).trim();
  const payload = verifyAccessToken(token);

  const user = await User.findById(payload.sub);
  if (!user) throw AppError.unauthorized('User no longer exists');
  if (!user.isActive) throw AppError.forbidden('Account is disabled');

  req.user = user;
  next();
});

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('Insufficient permissions'));
    }
    next();
  };
}

module.exports = { protect, authorize };
