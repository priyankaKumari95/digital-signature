'use strict';

const documentService = require('../services/document.service');
const signingService = require('../services/signing.service');
const asyncHandler = require('../utils/asyncHandler');

const upload = asyncHandler(async (req, res) => {
  const doc = await documentService.createDocument(
    { user: req.user, file: req.file, title: req.body.title },
    req
  );
  res.status(201).json({ success: true, data: { document: doc } });
});

const list = asyncHandler(async (req, res) => {
  const result = await documentService.listDocuments({ user: req.user, ...req.validatedQuery });
  res.json({ success: true, data: result });
});

const getOne = asyncHandler(async (req, res) => {
  const doc = await documentService.getDocument({ user: req.user, id: req.params.id });
  res.json({ success: true, data: { document: doc } });
});

function sendFile(res, { buffer, filename, mimeType }, { inline }) {
  const disposition = inline ? 'inline' : 'attachment';
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

const view = asyncHandler(async (req, res) => {
  const variant = req.validatedQuery?.variant || 'original';
  const file = await documentService.getDocumentFile(
    { user: req.user, id: req.params.id, variant, download: false },
    req
  );
  sendFile(res, file, { inline: true });
});

const download = asyncHandler(async (req, res) => {
  const variant = req.validatedQuery?.variant || 'signed';
  const file = await documentService.getDocumentFile(
    { user: req.user, id: req.params.id, variant, download: true },
    req
  );
  sendFile(res, file, { inline: false });
});

const remove = asyncHandler(async (req, res) => {
  const result = await documentService.deleteDocument({ user: req.user, id: req.params.id }, req);
  res.json({ success: true, data: result });
});

const sign = asyncHandler(async (req, res) => {
  const doc = await signingService.signDocument(
    {
      user: req.user,
      id: req.params.id,
      placements: req.body.placements,
      signerName: req.body.signerName,
    },
    req
  );
  res.json({ success: true, data: { document: doc } });
});

module.exports = { upload, list, getOne, view, download, remove, sign };
