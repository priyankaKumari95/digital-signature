'use strict';

const { z } = require('zod');
const { objectId } = require('./common.validators');

const ratio = z.number().min(0).max(1);

const placementSchema = z
  .object({
    page: z.number().int().min(1),
    x: ratio,
    y: ratio,
    width: z.number().min(0.01).max(1),
    height: z.number().min(0.01).max(1),
    imageDataUrl: z
      .string()
      .regex(/^data:image\/png;base64,/, 'Signature image must be a PNG data URL'),
    signatureId: objectId.optional(),
  })
  .refine((p) => p.x + p.width <= 1.0001, {
    message: 'Signature extends beyond the right edge of the page',
    path: ['width'],
  })
  .refine((p) => p.y + p.height <= 1.0001, {
    message: 'Signature extends beyond the bottom edge of the page',
    path: ['height'],
  });

const signSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    placements: z.array(placementSchema).min(1, 'At least one signature placement is required'),
    signerName: z.string().trim().min(1).max(120).optional(),
  }),
});

module.exports = { signSchema, placementSchema };
