'use strict';

const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, req);
  res.status(201).json({ success: true, data: result });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, req);
  res.json({ success: true, data: result });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body, req);
  res.json({
    success: true,
    data: {
      message: 'If an account exists for that email, a reset link has been sent.',
      ...result,
    },
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body, req);
  res.json({ success: true, data: { message: 'Password has been reset successfully.' } });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.json({ success: true, data: { user } });
});

module.exports = { register, login, forgotPassword, resetPassword, me };
