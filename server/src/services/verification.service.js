'use strict';

const Document = require('../models/Document');
const AppError = require('../utils/AppError');
const storage = require('../utils/storage');
const audit = require('./audit.service');
const { sha256 } = require('../utils/crypto');
const { DOC_STATUS, AUDIT_ACTIONS, TARGET_TYPES } = require('../utils/constants');

async function verify(verificationId, req) {
  const doc = await Document.findOne({
    verificationId,
    status: DOC_STATUS.SIGNED,
  }).populate('owner', 'name email');

  await audit.record({
    action: AUDIT_ACTIONS.DOCUMENT_VERIFIED,
    targetType: TARGET_TYPES.DOCUMENT,
    targetId: doc ? doc.id : undefined,
    req,
    metadata: { verificationId, found: !!doc },
  });

  if (!doc) {
    return { valid: false, message: 'No signed document matches this verification ID.' };
  }

  // rehash the stored file to catch tampering at rest
  let integrity = 'unknown';
  if (doc.signedFile && storage.exists(doc.signedFile.storageKey)) {
    const buffer = await storage.read(doc.signedFile.storageKey);
    integrity = sha256(buffer) === doc.sha256 ? 'intact' : 'mismatch';
  }

  return {
    valid: true,
    integrity,
    document: {
      verificationId: doc.verificationId,
      title: doc.title,
      originalFilename: doc.originalFilename,
      signerName: doc.signerName,
      accountHolder: doc.owner ? doc.owner.name : undefined,
      signedAt: doc.signedAt,
      sha256: doc.sha256,
      pageCount: doc.pageCount,
      signatureCount: doc.appliedSignatures ? doc.appliedSignatures.length : 0,
    },
  };
}

async function getVerifiedFile(verificationId, req) {
  const doc = await Document.findOne({ verificationId, status: DOC_STATUS.SIGNED });
  if (!doc || !doc.signedFile || !storage.exists(doc.signedFile.storageKey)) {
    throw AppError.notFound('No verifiable signed document found for this ID');
  }
  const buffer = await storage.read(doc.signedFile.storageKey);

  await audit.record({
    action: AUDIT_ACTIONS.DOCUMENT_VERIFIED,
    targetType: TARGET_TYPES.DOCUMENT,
    targetId: doc.id,
    req,
    metadata: { verificationId, downloaded: true },
  });

  const filename = `${doc.originalFilename.replace(/\.pdf$/i, '')}-signed.pdf`;
  return { buffer, filename, mimeType: 'application/pdf' };
}

module.exports = { verify, getVerifiedFile };
