'use strict';

const User = require('../models/User');
const AppError = require('../utils/AppError');
const { signAccessToken } = require('../utils/token');
const { generateResetToken, sha256 } = require('../utils/crypto');
const { sendPasswordResetEmail } = require('../utils/mailer');
const audit = require('./audit.service');
const { config } = require('../config/env');
const { AUDIT_ACTIONS, TARGET_TYPES, ROLES } = require('../utils/constants');

async function register({ name, email, password }, req) {
  const existing = await User.findOne({ email });
  if (existing) throw AppError.conflict('An account with this email already exists');

  const user = await User.create({ name, email, password, role: ROLES.USER });
  const token = signAccessToken(user);

  await audit.record({
    action: AUDIT_ACTIONS.USER_REGISTERED,
    actor: user.id,
    actorEmail: user.email,
    targetType: TARGET_TYPES.USER,
    targetId: user.id,
    req,
  });

  return { user: user.toJSON(), token };
}

async function login({ email, password }, req) {
  // password is select:false, ask for it explicitly
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    await audit.record({
      action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
      actorEmail: email,
      req,
      metadata: { reason: 'invalid_credentials' },
    });
    throw AppError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw AppError.forbidden('Account is disabled');

  user.lastLoginAt = new Date();
  await user.save();

  const token = signAccessToken(user);

  await audit.record({
    action: AUDIT_ACTIONS.USER_LOGGED_IN,
    actor: user.id,
    actorEmail: user.email,
    targetType: TARGET_TYPES.USER,
    targetId: user.id,
    req,
  });

  return { user: user.toJSON(), token };
}

async function forgotPassword({ email }, req) {
  const user = await User.findOne({ email });
  if (user) {
    const { raw, hash } = generateResetToken();
    user.resetPasswordTokenHash = hash;
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${config.clientUrl}/reset-password?token=${raw}&email=${encodeURIComponent(
      email
    )}`;
    await sendPasswordResetEmail(email, resetUrl);

    await audit.record({
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      actor: user.id,
      actorEmail: user.email,
      targetType: TARGET_TYPES.USER,
      targetId: user.id,
      req,
    });

    if (!config.isProd) return { resetToken: raw, resetUrl };
  }
  return {};
}

async function resetPassword({ token, password }, req) {
  const hash = sha256(token);
  const user = await User.findOne({
    resetPasswordTokenHash: hash,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordTokenHash +resetPasswordExpires');

  if (!user) throw AppError.badRequest('Invalid or expired reset token');

  user.password = password;
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  await audit.record({
    action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
    actor: user.id,
    actorEmail: user.email,
    targetType: TARGET_TYPES.USER,
    targetId: user.id,
    req,
  });

  return { user: user.toJSON() };
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('User not found');
  return user.toJSON();
}

module.exports = { register, login, forgotPassword, resetPassword, getMe };
