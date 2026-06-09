'use strict';

const User = require('../models/User');
const Document = require('../models/Document');
const Signature = require('../models/Signature');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const audit = require('./audit.service');
const { escapeRegex } = require('../utils/text');
const { DOC_STATUS, AUDIT_ACTIONS, TARGET_TYPES, ROLES } = require('../utils/constants');

async function getStats() {
  const [
    totalUsers,
    activeUsers,
    admins,
    totalDocuments,
    signedDocuments,
    totalSignatures,
    auditEvents,
    recentActivity,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: ROLES.ADMIN }),
    Document.countDocuments(),
    Document.countDocuments({ status: DOC_STATUS.SIGNED }),
    Signature.countDocuments(),
    AuditLog.countDocuments(),
    AuditLog.find().sort({ createdAt: -1 }).limit(10).populate('actor', 'name email').lean(),
  ]);

  return {
    users: { total: totalUsers, active: activeUsers, admins },
    documents: {
      total: totalDocuments,
      signed: signedDocuments,
      pending: totalDocuments - signedDocuments,
    },
    signatures: totalSignatures,
    auditEvents,
    recentActivity,
  };
}

async function listUsers({ page = 1, limit = 20, q } = {}) {
  const filter = {};
  if (q) {
    const safe = escapeRegex(q);
    filter.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
    ];
  }
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map((u) => u.toJSON()),
    pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
  };
}

async function updateUser({ admin, id, updates }, req) {
  if (admin.id === id) {
    throw AppError.badRequest('You cannot change your own role or status');
  }
  const user = await User.findById(id);
  if (!user) throw AppError.notFound('User not found');

  if (updates.role !== undefined) user.role = updates.role;
  if (updates.isActive !== undefined) user.isActive = updates.isActive;
  await user.save();

  await audit.record({
    action: AUDIT_ACTIONS.ADMIN_UPDATED_USER,
    actor: admin.id,
    actorEmail: admin.email,
    targetType: TARGET_TYPES.USER,
    targetId: user.id,
    req,
    metadata: { updates },
  });

  return user.toJSON();
}

async function listAllDocuments({ page = 1, limit = 20, status, q } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.title = { $regex: escapeRegex(q), $options: 'i' };

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Document.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('owner', 'name email'),
    Document.countDocuments(filter),
  ]);

  return {
    items: items.map((d) => {
      const json = d.toJSON();
      json.owner = d.owner ? { name: d.owner.name, email: d.owner.email } : null;
      return json;
    }),
    pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
  };
}

function listAuditLogs(query) {
  return audit.list(query);
}

module.exports = { getStats, listUsers, updateUser, listAllDocuments, listAuditLogs };
