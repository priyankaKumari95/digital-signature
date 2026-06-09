'use strict';

const { z } = require('zod');
const { objectId } = require('./common.validators');
const { ROLES, AUDIT_ACTIONS, DOC_STATUS } = require('../utils/constants');

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().max(255).optional(),
});

const listUsersSchema = z.object({ query: paginationQuery });

const listDocumentsSchema = z.object({
  query: paginationQuery.extend({
    status: z.enum(Object.values(DOC_STATUS)).optional(),
  }),
});

const listAuditSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    action: z.enum(Object.values(AUDIT_ACTIONS)).optional(),
    actor: objectId.optional(),
    targetId: objectId.optional(),
  }),
});

const updateUserSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      role: z.enum(Object.values(ROLES)).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((b) => b.role !== undefined || b.isActive !== undefined, {
      message: 'Provide at least one field to update (role or isActive)',
    }),
});

module.exports = {
  listUsersSchema,
  listDocumentsSchema,
  listAuditSchema,
  updateUserSchema,
};
