'use strict';

const mongoose = require('mongoose');
const { AUDIT_ACTIONS, TARGET_TYPES } = require('../utils/constants');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: true,
      index: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    actorEmail: { type: String },
    targetType: { type: String, enum: Object.values(TARGET_TYPES) },
    targetId: { type: mongoose.Schema.Types.ObjectId, index: true },
    ip: { type: String },
    userAgent: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

auditLogSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
