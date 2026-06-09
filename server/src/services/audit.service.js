'use strict';

const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

function requestMeta(req) {
  if (!req) return {};
  return {
    ip: req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress,
    userAgent: req.headers?.['user-agent'],
  };
}

async function record({ action, actor, actorEmail, targetType, targetId, req, metadata = {} }) {
  try {
    const { ip, userAgent } = requestMeta(req);
    return await AuditLog.create({
      action,
      actor: actor || undefined,
      actorEmail,
      targetType,
      targetId,
      ip,
      userAgent,
      metadata,
    });
  } catch (err) {
    logger.error('Failed to write audit log', { action, error: err.message });
    return null;
  }
}

async function list({ page = 1, limit = 25, action, actor, targetId } = {}) {
  const filter = {};
  if (action) filter.action = action;
  if (actor) filter.actor = actor;
  if (targetId) filter.targetId = targetId;

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('actor', 'name email role')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
  };
}

module.exports = { record, list };
