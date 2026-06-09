'use strict';

const { z } = require('zod');
const { objectId } = require('./common.validators');
const { DOC_STATUS } = require('../utils/constants');

const uploadSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(255).optional(),
  }),
});

const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(Object.values(DOC_STATUS)).optional(),
    q: z.string().trim().max(255).optional(),
  }),
});

const idSchema = z.object({
  params: z.object({ id: objectId }),
});

const downloadSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({ variant: z.enum(['original', 'signed']).optional() }),
});

module.exports = { uploadSchema, listSchema, idSchema, downloadSchema };
