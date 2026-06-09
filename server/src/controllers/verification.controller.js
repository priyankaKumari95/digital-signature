'use strict';

const verificationService = require('../services/verification.service');
const asyncHandler = require('../utils/asyncHandler');

const verify = asyncHandler(async (req, res) => {
  const result = await verificationService.verify(req.params.verificationId, req);
  res.json({ success: true, data: result });
});

const download = asyncHandler(async (req, res) => {
  const { buffer, filename, mimeType } = await verificationService.getVerifiedFile(
    req.params.verificationId,
    req
  );
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});

module.exports = { verify, download };
