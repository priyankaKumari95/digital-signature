'use strict';

const Document = require('../models/Document');
const documentService = require('./document.service');
const pdfService = require('./pdf.service');
const audit = require('./audit.service');
const storage = require('../utils/storage');
const AppError = require('../utils/AppError');
const { sha256, generateVerificationId } = require('../utils/crypto');
const { config } = require('../config/env');
const { DOC_STATUS, AUDIT_ACTIONS, TARGET_TYPES } = require('../utils/constants');

async function signDocument({ user, id, placements, signerName }, req) {
  const doc = await documentService.findAccessible(id, user);

  if (doc.status === DOC_STATUS.SIGNED) {
    throw AppError.conflict('Document is already signed');
  }
  if (!doc.originalFile || !storage.exists(doc.originalFile.storageKey)) {
    throw AppError.notFound('Original document file is missing');
  }

  const originalBuffer = await storage.read(doc.originalFile.storageKey);
  const verificationId = generateVerificationId();
  const verifyUrl = `${config.clientUrl}/verify/${verificationId}`;
  const resolvedSigner = signerName || user.name;

  const signedBuffer = await pdfService.signPdf(originalBuffer, {
    placements,
    verifyUrl,
    verificationId,
    signerName: resolvedSigner,
  });

  const hash = sha256(signedBuffer);
  const storageKey = await storage.save(signedBuffer, { suffix: '-signed' });

  // the status $ne SIGNED guard closes the read-check-write race: only the first concurrent request wins
  const updated = await Document.findOneAndUpdate(
    { _id: doc._id, status: { $ne: DOC_STATUS.SIGNED } },
    {
      $set: {
        signedFile: { storageKey, size: signedBuffer.length, mimeType: 'application/pdf' },
        sha256: hash,
        verificationId,
        signerName: resolvedSigner,
        signedAt: new Date(),
        status: DOC_STATUS.SIGNED,
        appliedSignatures: placements.map((p) => ({
          page: p.page,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          signatureId: p.signatureId,
        })),
      },
    },
    { new: true, runValidators: true }
  );

  if (!updated) {
    await storage.remove(storageKey);
    throw AppError.conflict('Document is already signed');
  }

  await audit.record({
    action: AUDIT_ACTIONS.DOCUMENT_SIGNED,
    actor: user.id,
    actorEmail: user.email,
    targetType: TARGET_TYPES.DOCUMENT,
    targetId: updated.id,
    req,
    metadata: { verificationId, sha256: hash, placements: placements.length },
  });

  return updated.toJSON();
}

module.exports = { signDocument };
