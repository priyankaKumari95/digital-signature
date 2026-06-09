'use strict';

const mongoose = require('mongoose');

const signatureSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: ['drawn', 'typed'], default: 'drawn' },
    dataUrl: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^data:image\/png;base64,/.test(v),
        message: 'Signature must be a PNG data URL',
      },
    },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

signatureSchema.index({ owner: 1, createdAt: -1 });

signatureSchema.index(
  { owner: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

signatureSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Signature', signatureSchema);
