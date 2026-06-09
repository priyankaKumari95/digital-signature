'use strict';

const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const idParam = z.object({
  params: z.object({ id: objectId }),
});

module.exports = { objectId, idParam };
