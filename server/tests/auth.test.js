'use strict';

const { app, request, registerUser, DEFAULT_PASSWORD } = require('./helpers');
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');
const { AUDIT_ACTIONS } = require('../src/utils/constants');

describe('Auth module', () => {
  describe('POST /api/auth/register', () => {
    it('registers a new user and returns a token', async () => {
      const { res, token, user } = await registerUser({ email: 'alice@example.com' });
      expect(res.status).toBe(201);
      expect(token).toBeTruthy();
      expect(user.email).toBe('alice@example.com');
      expect(user.role).toBe('user');
      expect(user.password).toBeUndefined();
    });

    it('hashes the password (never stored in plaintext)', async () => {
      await registerUser({ email: 'bob@example.com', password: DEFAULT_PASSWORD });
      const dbUser = await User.findOne({ email: 'bob@example.com' }).select('+password');
      expect(dbUser.password).not.toBe(DEFAULT_PASSWORD);
      expect(dbUser.password.startsWith('$2')).toBe(true);
    });

    it('writes an audit log on registration', async () => {
      await registerUser({ email: 'carol@example.com' });
      const log = await AuditLog.findOne({ action: AUDIT_ACTIONS.USER_REGISTERED });
      expect(log).toBeTruthy();
      expect(log.actorEmail).toBe('carol@example.com');
    });

    it('rejects duplicate emails', async () => {
      await registerUser({ email: 'dup@example.com' });
      const { res } = await registerUser({ email: 'dup@example.com' });
      expect(res.status).toBe(409);
    });

    it('rejects weak passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Weak', email: 'weak@example.com', password: 'short' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid emails', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Bad', email: 'not-an-email', password: DEFAULT_PASSWORD });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await registerUser({ email: 'login@example.com', password: DEFAULT_PASSWORD });
    });

    it('logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: DEFAULT_PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeTruthy();
    });

    it('rejects wrong password and audits the failure', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'WrongPass123' });
      expect(res.status).toBe(401);
      const log = await AuditLog.findOne({ action: AUDIT_ACTIONS.USER_LOGIN_FAILED });
      expect(log).toBeTruthy();
    });

    it('rejects unknown email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: DEFAULT_PASSWORD });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the current user with a valid token', async () => {
      const { token } = await registerUser({ email: 'me@example.com' });
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('me@example.com');
    });

    it('rejects requests without a token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects an invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.real.token');
      expect(res.status).toBe(401);
    });
  });

  describe('Password recovery', () => {
    it('issues a reset token and resets the password', async () => {
      await registerUser({ email: 'reset@example.com', password: DEFAULT_PASSWORD });

      const forgot = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'reset@example.com' });
      expect(forgot.status).toBe(200);
      const resetToken = forgot.body.data.resetToken; // exposed in non-prod
      expect(resetToken).toBeTruthy();

      const reset = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, password: 'NewPassword123' });
      expect(reset.status).toBe(200);

      const oldLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'reset@example.com', password: DEFAULT_PASSWORD });
      expect(oldLogin.status).toBe(401);

      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'reset@example.com', password: 'NewPassword123' });
      expect(newLogin.status).toBe(200);
    });

    it('does not reveal whether an email exists', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'ghost@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.data.resetToken).toBeUndefined();
    });

    it('rejects an invalid reset token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid-token', password: 'NewPassword123' });
      expect(res.status).toBe(400);
    });
  });
});
