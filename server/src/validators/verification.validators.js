'use strict';

const { z } = require('zod');

const verificationIdParam = z.object({
  params: z.object({
    verificationId: z.string().regex(/^[0-9a-f]{32}$/, 'Invalid verification ID'),
  }),
});

module.exports = { verificationIdParam };
