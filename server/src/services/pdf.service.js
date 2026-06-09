'use strict';

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
const AppError = require('../utils/AppError');

async function load(buffer) {
  try {
    return await PDFDocument.load(buffer, { ignoreEncryption: false });
  } catch (err) {
    throw AppError.badRequest('The uploaded file is not a valid, readable PDF');
  }
}

async function getPageCount(buffer) {
  const doc = await load(buffer);
  return doc.getPageCount();
}

function dataUrlToBuffer(dataUrl) {
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl || '');
  if (!match) throw AppError.badRequest('Signature image must be a PNG data URL');
  return Buffer.from(match[1], 'base64');
}

async function signPdf(originalBuffer, { placements, verifyUrl, verificationId, signerName }) {
  const doc = await load(originalBuffer);
  const pages = doc.getPages();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const p of placements) {
    const pageIndex = p.page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) {
      throw AppError.badRequest(`Signature placed on a non-existent page: ${p.page}`);
    }
    const page = pages[pageIndex];
    const { width: pw, height: ph } = page.getSize();

    const pngBuffer = dataUrlToBuffer(p.imageDataUrl);
    const png = await doc.embedPng(pngBuffer);

    const drawW = p.width * pw;
    const drawH = p.height * ph;
    const drawX = p.x * pw;
    // top-left ratio origin -> pdf-lib bottom-left origin
    const drawY = ph - p.y * ph - drawH;

    page.drawImage(png, { x: drawX, y: drawY, width: drawW, height: drawH });

    if (signerName) {
      page.drawText(signerName, {
        x: drawX,
        y: Math.max(drawY - 10, 2),
        size: 7,
        font,
        color: rgb(0.35, 0.35, 0.35),
      });
    }
  }

  await stampVerificationBanner(doc, font, { verifyUrl, verificationId });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

async function stampVerificationBanner(doc, font, { verifyUrl, verificationId }) {
  const pages = doc.getPages();
  const page = pages[pages.length - 1];
  const { width: pw } = page.getSize();

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 120 });
  const qrPng = await doc.embedPng(Buffer.from(qrDataUrl.split(',')[1], 'base64'));

  const qrSize = 46;
  const margin = 18;
  const baseY = 14;

  page.drawLine({
    start: { x: margin, y: baseY + qrSize + 6 },
    end: { x: pw - margin, y: baseY + qrSize + 6 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawImage(qrPng, { x: margin, y: baseY, width: qrSize, height: qrSize });

  const textX = margin + qrSize + 10;
  page.drawText('Digitally signed & verifiable via DigiSign', {
    x: textX,
    y: baseY + qrSize - 8,
    size: 9,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText(`Verification ID: ${verificationId}`, {
    x: textX,
    y: baseY + qrSize - 22,
    size: 8,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  page.drawText(`Verify at: ${verifyUrl}`, {
    x: textX,
    y: baseY + qrSize - 34,
    size: 7,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
}

module.exports = { load, getPageCount, signPdf, dataUrlToBuffer };
