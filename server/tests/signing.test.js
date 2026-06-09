'use strict';

const { app, request, makePdf, registerUser, auth, PNG_DATA_URL } = require('./helpers');
const { PDFDocument } = require('pdf-lib');

describe('Signing + verification workflow', () => {
  let token;
  let docId;

  beforeEach(async () => {
    ({ token } = await registerUser({ name: 'Jane Signer' }));
    const up = await request(app)
      .post('/api/documents')
      .set(auth(token))
      .attach('file', await makePdf(1), 'contract.pdf');
    docId = up.body.data.document.id;
  });

  const placement = {
    page: 1,
    x: 0.1,
    y: 0.8,
    width: 0.2,
    height: 0.08,
    imageDataUrl: PNG_DATA_URL,
  };

  it('signs a document, producing a hash and verification id', async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/sign`)
      .set(auth(token))
      .send({ placements: [placement] });

    expect(res.status).toBe(200);
    const doc = res.body.data.document;
    expect(doc.status).toBe('signed');
    expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(doc.verificationId).toMatch(/^[0-9a-f]{32}$/);
    expect(doc.signerName).toBe('Jane Signer');
    expect(doc.appliedSignatures).toHaveLength(1);
  });

  it('produces a downloadable, valid signed PDF', async () => {
    await request(app)
      .post(`/api/documents/${docId}/sign`)
      .set(auth(token))
      .send({ placements: [placement] });

    const res = await request(app)
      .get(`/api/documents/${docId}/download?variant=signed`)
      .set(auth(token))
      .buffer()
      .parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    const loaded = await PDFDocument.load(res.body);
    expect(loaded.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('rejects signing an already-signed document', async () => {
    await request(app)
      .post(`/api/documents/${docId}/sign`)
      .set(auth(token))
      .send({ placements: [placement] });

    const again = await request(app)
      .post(`/api/documents/${docId}/sign`)
      .set(auth(token))
      .send({ placements: [placement] });
    expect(again.status).toBe(409);
  });

  it('rejects a placement on a non-existent page', async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/sign`)
      .set(auth(token))
      .send({ placements: [{ ...placement, page: 5 }] });
    expect(res.status).toBe(400);
  });

  it('requires at least one placement', async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/sign`)
      .set(auth(token))
      .send({ placements: [] });
    expect(res.status).toBe(400);
  });

  it('rejects a placement that extends beyond the page bounds', async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/sign`)
      .set(auth(token))
      .send({ placements: [{ ...placement, x: 0.8, width: 0.5 }] });
    expect(res.status).toBe(400);
  });

  it('allows only one of two concurrent sign requests (no race)', async () => {
    const sign = () =>
      request(app)
        .post(`/api/documents/${docId}/sign`)
        .set(auth(token))
        .send({ placements: [placement] });

    const [a, b] = await Promise.all([sign(), sign()]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
  });

  describe('Public verification', () => {
    let verificationId;

    beforeEach(async () => {
      const signed = await request(app)
        .post(`/api/documents/${docId}/sign`)
        .set(auth(token))
        .send({ placements: [placement] });
      verificationId = signed.body.data.document.verificationId;
    });

    it('verifies a genuine document without auth', async () => {
      const res = await request(app).get(`/api/verify/${verificationId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.integrity).toBe('intact');
      expect(res.body.data.document.signerName).toBe('Jane Signer');
      expect(res.body.data.document.email).toBeUndefined();
    });

    it('returns valid:false for an unknown id', async () => {
      const res = await request(app).get(`/api/verify/${'0'.repeat(32)}`);
      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(false);
    });

    it('rejects a malformed verification id', async () => {
      const res = await request(app).get('/api/verify/not-valid');
      expect(res.status).toBe(400);
    });

    it('allows public download of the signed file', async () => {
      const res = await request(app).get(`/api/verify/${verificationId}/download`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });
});
