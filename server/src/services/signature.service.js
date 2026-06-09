'use strict';

const Signature = require('../models/Signature');
const AppError = require('../utils/AppError');
const audit = require('./audit.service');
const { AUDIT_ACTIONS, TARGET_TYPES } = require('../utils/constants');

async function createSignature({ user, name, type, dataUrl, isDefault }, req) {
  if (isDefault) {
    await Signature.updateMany({ owner: user.id, isDefault: true }, { isDefault: false });
  }
  const signature = await Signature.create({
    owner: user.id,
    name,
    type,
    dataUrl,
    isDefault: !!isDefault,
  });

  await audit.record({
    action: AUDIT_ACTIONS.SIGNATURE_CREATED,
    actor: user.id,
    actorEmail: user.email,
    targetType: TARGET_TYPES.SIGNATURE,
    targetId: signature.id,
    req,
    metadata: { name, type },
  });

  return signature.toJSON();
}

async function listSignatures(user) {
  const items = await Signature.find({ owner: user.id }).sort({ isDefault: -1, createdAt: -1 });
  return items.map((s) => s.toJSON());
}

async function deleteSignature({ user, id }, req) {
  const signature = await Signature.findOne({ _id: id, owner: user.id });
  if (!signature) throw AppError.notFound('Signature not found');
  await signature.deleteOne();

  await audit.record({
    action: AUDIT_ACTIONS.SIGNATURE_DELETED,
    actor: user.id,
    actorEmail: user.email,
    targetType: TARGET_TYPES.SIGNATURE,
    targetId: id,
    req,
  });

  return { id };
}

module.exports = { createSignature, listSignatures, deleteSignature };
