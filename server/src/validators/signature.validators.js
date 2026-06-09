'use strict';

const { z } = require('zod');

const createSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(80),
    type: z.enum(['drawn', 'typed']).default('drawn'),
    dataUrl: z
      .string()
      .regex(/^data:image\/png;base64,/, 'Signature must be a PNG data URL')
      .max(2_800_000, 'Signature image is too large'),
    isDefault: z.boolean().optional(),
  }),
});

module.exports = { createSchema };
