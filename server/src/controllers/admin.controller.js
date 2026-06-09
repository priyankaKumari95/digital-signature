'use strict';

const adminService = require('../services/admin.service');
const asyncHandler = require('../utils/asyncHandler');

const stats = asyncHandler(async (req, res) => {
  const data = await adminService.getStats();
  res.json({ success: true, data });
});

const listUsers = asyncHandler(async (req, res) => {
  const data = await adminService.listUsers(req.validatedQuery);
  res.json({ success: true, data });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await adminService.updateUser(
    { admin: req.user, id: req.params.id, updates: req.body },
    req
  );
  res.json({ success: true, data: { user } });
});

const listDocuments = asyncHandler(async (req, res) => {
  const data = await adminService.listAllDocuments(req.validatedQuery);
  res.json({ success: true, data });
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const data = await adminService.listAuditLogs(req.validatedQuery);
  res.json({ success: true, data });
});

module.exports = { stats, listUsers, updateUser, listDocuments, listAuditLogs };
