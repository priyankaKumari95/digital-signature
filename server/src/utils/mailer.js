'use strict';

const nodemailer = require('nodemailer');
const { config } = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (config.smtp.host) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    if (!config.isTest) {
      logger.info(`[mailer:stub] To: ${to} | ${subject}\n${text}`);
    }
    return { stubbed: true };
  }
  return t.sendMail({ from: config.smtp.from, to, subject, text, html });
}

async function sendPasswordResetEmail(to, resetUrl) {
  const subject = 'Reset your password';
  const text = `You requested a password reset.\n\nReset link (valid for ${config.jwt.resetExpiresIn}):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`;
  const html = `<p>You requested a password reset.</p>
    <p><a href="${resetUrl}">Click here to reset your password</a> (valid for ${config.jwt.resetExpiresIn}).</p>
    <p>If you did not request this, you can safely ignore this email.</p>`;
  return sendMail({ to, subject, text, html });
}

module.exports = { sendMail, sendPasswordResetEmail };
