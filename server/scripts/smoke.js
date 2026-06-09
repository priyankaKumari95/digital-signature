'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-secret';
process.env.JWT_RESET_SECRET = process.env.JWT_RESET_SECRET || 'smoke-reset-secret';

require('../tests/mongo-config');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { PDFDocument } = require('pdf-lib');

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const assert = (cond, msg) => {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ✓ ${msg}`);
};

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();

  const { connectDB, disconnectDB } = require('../src/config/db');
  const createApp = require('../src/app');
  await connectDB(process.env.MONGO_URI);

  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;

  try {
    let res = await fetch(`${base}/health`);
    assert(res.ok, 'GET /health returns 200');

    res = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Smoke Tester', email: 'smoke@test.local', password: 'Password123' }),
    });
    let body = await res.json();
    assert(res.status === 201 && body.data.token, 'register returns 201 + token');
    const token = body.data.token;
    const authH = { Authorization: `Bearer ${token}` };

    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595, 842]);
    const pdfBytes = await pdfDoc.save();
    const form = new FormData();
    form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'smoke.pdf');
    form.append('title', 'Smoke Contract');
    res = await fetch(`${base}/documents`, { method: 'POST', headers: authH, body: form });
    body = await res.json();
    assert(res.status === 201 && body.data.document.status === 'uploaded', 'upload returns 201 + uploaded doc');
    const docId = body.data.document.id;

    res = await fetch(`${base}/documents/${docId}/sign`, {
      method: 'POST',
      headers: { ...authH, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placements: [{ page: 1, x: 0.1, y: 0.8, width: 0.2, height: 0.08, imageDataUrl: PNG }],
      }),
    });
    body = await res.json();
    assert(res.status === 200 && body.data.document.status === 'signed', 'sign returns 200 + signed doc');
    assert(/^[0-9a-f]{64}$/.test(body.data.document.sha256), 'signed doc has SHA-256 fingerprint');
    const verificationId = body.data.document.verificationId;

    res = await fetch(`${base}/verify/${verificationId}`);
    body = await res.json();
    assert(res.status === 200 && body.data.valid === true, 'public verify returns valid:true');
    assert(body.data.integrity === 'intact', 'integrity check is intact');

    res = await fetch(`${base}/verify/${verificationId}/download`);
    const buf = Buffer.from(await res.arrayBuffer());
    const loaded = await PDFDocument.load(buf);
    assert(res.ok && loaded.getPageCount() >= 1, 'signed PDF downloads and is a valid PDF');

    console.log('\nSMOKE TEST PASSED ✅');
  } finally {
    await new Promise((r) => server.close(r));
    await disconnectDB();
    await mongod.stop();
  }
}

main().catch((err) => {
  console.error('\nSMOKE TEST FAILED ❌\n', err);
  process.exit(1);
});
