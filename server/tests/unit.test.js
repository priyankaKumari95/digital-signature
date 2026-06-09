'use strict';

const { sha256, generateResetToken, generateVerificationId } = require('../src/utils/crypto');
const pdfService = require('../src/services/pdf.service');
const { makePdf, PNG_DATA_URL } = require('./helpers');

describe('crypto utils (unit)', () => {
  it('sha256 is deterministic and 64 hex chars', () => {
    const a = sha256('hello');
    const b = sha256('hello');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256('hello')).not.toBe(sha256('world'));
  });

  it('reset token returns matching raw/hash pair', () => {
    const { raw, hash } = generateResetToken();
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256(raw)).toBe(hash);
  });

  it('verification ids are unique 32-hex strings', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateVerificationId()));
    expect(ids.size).toBe(100);
    ids.forEach((id) => expect(id).toMatch(/^[0-9a-f]{32}$/));
  });
});

describe('pdf.service (unit)', () => {
  it('counts pages of a PDF', async () => {
    const pdf = await makePdf(3);
    expect(await pdfService.getPageCount(pdf)).toBe(3);
  });

  it('rejects invalid PDF bytes', async () => {
    await expect(pdfService.getPageCount(Buffer.from('nope'))).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('signs a PDF and returns a larger, valid buffer', async () => {
    const pdf = await makePdf(1);
    const signed = await pdfService.signPdf(pdf, {
      placements: [{ page: 1, x: 0.1, y: 0.1, width: 0.2, height: 0.1, imageDataUrl: PNG_DATA_URL }],
      verifyUrl: 'http://localhost:5173/verify/abc',
      verificationId: 'abc123',
      signerName: 'Tester',
    });
    expect(Buffer.isBuffer(signed)).toBe(true);
    expect(await pdfService.getPageCount(signed)).toBe(1);
  });

  it('rejects a non-PNG signature data URL', async () => {
    const pdf = await makePdf(1);
    await expect(
      pdfService.signPdf(pdf, {
        placements: [{ page: 1, x: 0.1, y: 0.1, width: 0.2, height: 0.1, imageDataUrl: 'data:image/jpeg;base64,zzz' }],
        verifyUrl: 'http://x/verify/abc',
        verificationId: 'abc',
        signerName: 'T',
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
