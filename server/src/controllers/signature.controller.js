'use strict';

const signatureService = require('../services/signature.service');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const signature = await signatureService.createSignature({ user: req.user, ...req.body }, req);
  res.status(201).json({ success: true, data: { signature } });
});

const list = asyncHandler(async (req, res) => {
  const signatures = await signatureService.listSignatures(req.user);
  res.json({ success: true, data: { signatures } });
});

const remove = asyncHandler(async (req, res) => {
  const result = await signatureService.deleteSignature({ user: req.user, id: req.params.id }, req);
  res.json({ success: true, data: result });
});

module.exports = { create, list, remove };
