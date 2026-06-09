'use strict';

const Document = require('../models/Document');
const AppError = require('../utils/AppError');
const storage = require('../utils/storage');
const pdfService = require('./pdf.service');
const audit = require('./audit.service');
const { escapeRegex } = require('../utils/text');
const { DOC_STATUS, AUDIT_ACTIONS, TARGET_TYPES, ROLES } = require('../utils/constants');

async function findAccessible(id, user) {
  const doc = await Document.findById(id);
  if (!doc) throw AppError.notFound('Document not found');
  const isOwner = doc.owner.toString() === user.id;
  if (!isOwner && user.role !== ROLES.ADMIN) {
    throw AppError.forbidden('You do not have access to this document');
  }
  return doc;
}

async function createDocument({ user, file, title }, req) {
  if (!file) throw AppError.badRequest('A PDF file is required');

  const pageCount = await pdfService.getPageCount(file.buffer);

  const storageKey = await storage.save(file.buffer, { suffix: '-original' });

  // drop the saved file if the DB write fails so it isn't orphaned
  let doc;
  try {
    doc = await Document.create({
      owner: user.id,
      title: title || file.originalname.replace(/\.pdf$/i, ''),
      originalFilename: file.originalname,
      status: DOC_STATUS.UPLOADED,
      pageCount,
      originalFile: { storageKey, size: file.size, mimeType: 'application/pdf' },
    });
  } catch (err) {
    await storage.remove(storageKey);
    throw err;
  }

  await audit.record({
    action: AUDIT_ACTIONS.DOCUMENT_UPLOADED,
    actor: user.id,
    actorEmail: user.email,
    targetType: TARGET_TYPES.DOCUMENT,
    targetId: doc.id,
    req,
    metadata: { title: doc.title, pageCount },
  });

  return doc.toJSON();
}

async function listDocuments({ user, page = 1, limit = 10, status, q }) {
  const filter = { owner: user.id };
  if (status) filter.status = status;
  if (q) filter.title = { $regex: escapeRegex(q), $options: 'i' };

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Document.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Document.countDocuments(filter),
  ]);

  return {
    items: items.map((d) => d.toJSON()),
    pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
  };
}

async function getDocument({ user, id }) {
  const doc = await findAccessible(id, user);
  return doc.toJSON();
}

async function getDocumentFile({ user, id, variant = 'original', download = false }, req) {
  const doc = await findAccessible(id, user);
  const meta = variant === 'signed' ? doc.signedFile : doc.originalFile;
  if (!meta || !storage.exists(meta.storageKey)) {
    throw AppError.notFound(`No ${variant} file available for this document`);
  }
  const buffer = await storage.read(meta.storageKey);

  await audit.record({
    action: download ? AUDIT_ACTIONS.DOCUMENT_DOWNLOADED : AUDIT_ACTIONS.DOCUMENT_VIEWED,
    actor: user.id,
    actorEmail: user.email,
    targetType: TARGET_TYPES.DOCUMENT,
    targetId: doc.id,
    req,
    metadata: { variant },
  });

  const baseName = doc.originalFilename.replace(/\.pdf$/i, '');
  const filename = variant === 'signed' ? `${baseName}-signed.pdf` : doc.originalFilename;
  return { buffer, filename, mimeType: 'application/pdf' };
}

async function deleteDocument({ user, id }, req) {
  const doc = await findAccessible(id, user);

  await storage.remove(doc.originalFile?.storageKey);
  await storage.remove(doc.signedFile?.storageKey);
  await doc.deleteOne();

  await audit.record({
    action: AUDIT_ACTIONS.DOCUMENT_DELETED,
    actor: user.id,
    actorEmail: user.email,
    targetType: TARGET_TYPES.DOCUMENT,
    targetId: doc.id,
    req,
    metadata: { title: doc.title },
  });

  return { id };
}

module.exports = {
  findAccessible,
  createDocument,
  listDocuments,
  getDocument,
  getDocumentFile,
  deleteDocument,
};
