'use strict';

const { app, request, registerUser, createAdminAndLogin, auth, makePdf } = require('./helpers');

describe('Admin module', () => {
  it('blocks non-admins from admin routes', async () => {
    const { token } = await registerUser();
    const res = await request(app).get('/api/admin/stats').set(auth(token));
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('returns platform stats', async () => {
    await registerUser();
    const { token: adminToken } = await createAdminAndLogin();

    const res = await request(app).get('/api/admin/stats').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.users.total).toBeGreaterThanOrEqual(2);
    expect(res.body.data.documents).toHaveProperty('total');
    expect(Array.isArray(res.body.data.recentActivity)).toBe(true);
  });

  it('lists users', async () => {
    await registerUser({ email: 'listed@example.com' });
    const { token: adminToken } = await createAdminAndLogin();
    const res = await request(app).get('/api/admin/users').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
  });

  it('lists all documents across users', async () => {
    const { token } = await registerUser();
    await request(app).post('/api/documents').set(auth(token)).attach('file', await makePdf(1), 'a.pdf');

    const { token: adminToken } = await createAdminAndLogin();
    const res = await request(app).get('/api/admin/documents').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].owner).toHaveProperty('email');
  });

  it('updates a user role and audits it', async () => {
    const { user } = await registerUser({ email: 'promote@example.com' });
    const { token: adminToken } = await createAdminAndLogin();

    const res = await request(app)
      .patch(`/api/admin/users/${user.id}`)
      .set(auth(adminToken))
      .send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('admin');

    const logs = await request(app)
      .get('/api/admin/audit-logs?action=ADMIN_UPDATED_USER')
      .set(auth(adminToken));
    expect(logs.body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  it('prevents an admin from changing their own role', async () => {
    const { token: adminToken, user: admin } = await createAdminAndLogin();
    const res = await request(app)
      .patch(`/api/admin/users/${admin.id}`)
      .set(auth(adminToken))
      .send({ isActive: false });
    expect(res.status).toBe(400);
  });

  it('lists audit logs with pagination', async () => {
    await registerUser();
    const { token: adminToken } = await createAdminAndLogin();
    const res = await request(app).get('/api/admin/audit-logs?limit=5').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(5);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });
});
