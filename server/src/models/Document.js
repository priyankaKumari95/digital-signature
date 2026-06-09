'use strict';

const mongoose = require('mongoose');
const { DOC_STATUS } = require('../utils/constants');

const placementSchema = new mongoose.Schema(
  {
    page: { type: Number, required: true, min: 1 },
    x: { type: Number, required: true, min: 0, max: 1 },
    y: { type: Number, required: true, min: 0, max: 1 },
    width: { type: Number, required: true, min: 0, max: 1 },
    height: { type: Number, required: true, min: 0, max: 1 },
    signatureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Signature' },
  },
  { _id: false }
);

const fileMetaSchema = new mongoose.Schema(
  {
    storageKey: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, default: 'application/pdf' },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 255 },
    originalFilename: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(DOC_STATUS),
      default: DOC_STATUS.UPLOADED,
      index: true,
    },
    pageCount: { type: Number, default: 0 },

    originalFile: { type: fileMetaSchema, required: true },
    signedFile: { type: fileMetaSchema },

    appliedSignatures: { type: [placementSchema], default: [] },

    verificationId: { type: String, unique: true, sparse: true, index: true },
    sha256: { type: String },
    signerName: { type: String },
    signedAt: { type: Date },
  },
  { timestamps: true }
);

documentSchema.index({ owner: 1, createdAt: -1 });

documentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    if (ret.originalFile) delete ret.originalFile.storageKey;
    if (ret.signedFile) delete ret.signedFile.storageKey;
    return ret;
  },
});

module.exports = mongoose.model('Document', documentSchema);
