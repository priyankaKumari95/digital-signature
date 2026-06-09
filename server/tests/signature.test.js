'use strict';

const { app, request, registerUser, auth, PNG_DATA_URL } = require('./helpers');

describe('Signature (reusable assets) module', () => {
  let token;
  beforeEach(async () => {
    ({ token } = await registerUser());
  });

  it('creates a signature', async () => {
    const res = await request(app)
      .post('/api/signatures')
      .set(auth(token))
      .send({ name: 'My Signature', type: 'drawn', dataUrl: PNG_DATA_URL });
    expect(res.status).toBe(201);
    expect(res.body.data.signature.name).toBe('My Signature');
  });

  it('rejects a non-PNG dataUrl', async () => {
    const res = await request(app)
      .post('/api/signatures')
      .set(auth(token))
      .send({ name: 'Bad', dataUrl: 'data:image/jpeg;base64,zzz' });
    expect(res.status).toBe(400);
  });

  it('lists only the owner signatures', async () => {
    await request(app)
      .post('/api/signatures')
      .set(auth(token))
      .send({ name: 'A', dataUrl: PNG_DATA_URL });

    const { token: other } = await registerUser();
    await request(app)
      .post('/api/signatures')
      .set(auth(other))
      .send({ name: 'B', dataUrl: PNG_DATA_URL });

    const res = await request(app).get('/api/signatures').set(auth(token));
    expect(res.body.data.signatures).toHaveLength(1);
    expect(res.body.data.signatures[0].name).toBe('A');
  });

  it('enforces a single default signature', async () => {
    await request(app)
      .post('/api/signatures')
      .set(auth(token))
      .send({ name: 'First', dataUrl: PNG_DATA_URL, isDefault: true });
    await request(app)
      .post('/api/signatures')
      .set(auth(token))
      .send({ name: 'Second', dataUrl: PNG_DATA_URL, isDefault: true });

    const res = await request(app).get('/api/signatures').set(auth(token));
    const defaults = res.body.data.signatures.filter((s) => s.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].name).toBe('Second');
  });

  it('deletes an owned signature', async () => {
    const created = await request(app)
      .post('/api/signatures')
      .set(auth(token))
      .send({ name: 'ToDelete', dataUrl: PNG_DATA_URL });
    const id = created.body.data.signature.id;

    const res = await request(app).delete(`/api/signatures/${id}`).set(auth(token));
    expect(res.status).toBe(200);

    const list = await request(app).get('/api/signatures').set(auth(token));
    expect(list.body.data.signatures).toHaveLength(0);
  });
});
