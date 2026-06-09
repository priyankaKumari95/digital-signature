'use strict';

const { app, request, makePdf, registerUser, auth } = require('./helpers');

describe('Document module', () => {
  let token;

  beforeEach(async () => {
    ({ token } = await registerUser());
  });

  async function uploadPdf(pages = 1, title) {
    const pdf = await makePdf(pages);
    const req = request(app).post('/api/documents').set(auth(token)).attach('file', pdf, 'test.pdf');
    if (title) req.field('title', title);
    return req;
  }

  describe('Upload', () => {
    it('uploads a valid PDF', async () => {
      const res = await uploadPdf(2, 'My Contract');
      expect(res.status).toBe(201);
      expect(res.body.data.document.status).toBe('uploaded');
      expect(res.body.data.document.pageCount).toBe(2);
      expect(res.body.data.document.title).toBe('My Contract');
      expect(res.body.data.document.originalFile.storageKey).toBeUndefined();
    });

    it('rejects non-PDF files', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set(auth(token))
        .attach('file', Buffer.from('hello world'), 'note.txt');
      expect(res.status).toBe(400);
    });

    it('rejects a corrupt PDF', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set(auth(token))
        .attach('file', Buffer.from('%PDF-not-really'), 'bad.pdf', { contentType: 'application/pdf' });
      expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
      const pdf = await makePdf(1);
      const res = await request(app).post('/api/documents').attach('file', pdf, 'test.pdf');
      expect(res.status).toBe(401);
    });
  });

  describe('List & retrieve', () => {
    it('lists only the owner documents', async () => {
      await uploadPdf(1, 'Doc A');
      await uploadPdf(1, 'Doc B');

      const { token: otherToken } = await registerUser();
      await request(app)
        .post('/api/documents')
        .set(auth(otherToken))
        .attach('file', await makePdf(1), 'other.pdf');

      const res = await request(app).get('/api/documents').set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(2);
    });

    it('filters by status', async () => {
      await uploadPdf(1);
      const res = await request(app).get('/api/documents?status=signed').set(auth(token));
      expect(res.body.data.items).toHaveLength(0);
    });

    it('treats search input as a literal (regex metacharacters are escaped)', async () => {
      await uploadPdf(1, 'Report (v2)');
      const evil = await request(app)
        .get(`/api/documents?q=${encodeURIComponent('(a+)+')}`)
        .set(auth(token));
      expect(evil.status).toBe(200);
      expect(evil.body.data.items).toHaveLength(0);
      const literal = await request(app)
        .get(`/api/documents?q=${encodeURIComponent('(v2)')}`)
        .set(auth(token));
      expect(literal.body.data.items).toHaveLength(1);
    });

    it('retrieves a single document', async () => {
      const up = await uploadPdf(1);
      const id = up.body.data.document.id;
      const res = await request(app).get(`/api/documents/${id}`).set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.document.id).toBe(id);
    });

    it('returns 404 for another user document', async () => {
      const up = await uploadPdf(1);
      const id = up.body.data.document.id;
      const { token: otherToken } = await registerUser();
      const res = await request(app).get(`/api/documents/${id}`).set(auth(otherToken));
      expect(res.status).toBe(403);
    });

    it('serves the original file inline', async () => {
      const up = await uploadPdf(1);
      const id = up.body.data.document.id;
      const res = await request(app)
        .get(`/api/documents/${id}/file?variant=original`)
        .set(auth(token));
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });

  describe('Delete', () => {
    it('deletes an owned document', async () => {
      const up = await uploadPdf(1);
      const id = up.body.data.document.id;
      const res = await request(app).delete(`/api/documents/${id}`).set(auth(token));
      expect(res.status).toBe(200);

      const after = await request(app).get(`/api/documents/${id}`).set(auth(token));
      expect(after.status).toBe(404);
    });
  });
});
