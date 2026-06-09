'use strict';

const request = require('supertest');
const { PDFDocument } = require('pdf-lib');
const createApp = require('../src/app');
const User = require('../src/models/User');
const { ROLES } = require('../src/utils/constants');

const app = createApp();

const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function makePdf(pages = 1) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([595, 842]); // A4
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

const DEFAULT_PASSWORD = 'Password123';

async function registerUser(overrides = {}) {
  const payload = {
    name: overrides.name || 'Test User',
    email: overrides.email || `user_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`,
    password: overrides.password || DEFAULT_PASSWORD,
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  return { res, token: res.body?.data?.token, user: res.body?.data?.user, payload };
}

async function createAdminAndLogin(overrides = {}) {
  const email = overrides.email || `admin_${Date.now()}@example.com`;
  const password = overrides.password || DEFAULT_PASSWORD;
  await User.create({ name: 'Admin', email, password, role: ROLES.ADMIN });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { token: res.body.data.token, user: res.body.data.user };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = {
  app,
  request,
  makePdf,
  PNG_DATA_URL,
  DEFAULT_PASSWORD,
  registerUser,
  createAdminAndLogin,
  auth,
};
