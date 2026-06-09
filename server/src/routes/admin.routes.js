'use strict';

const express = require('express');
const ctrl = require('../controllers/admin.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const {
  listUsersSchema,
  listDocumentsSchema,
  listAuditSchema,
  updateUserSchema,
} = require('../validators/admin.validators');

const router = express.Router();

router.use(protect, authorize(ROLES.ADMIN));

router.get('/stats', ctrl.stats);
router.get('/users', validate(listUsersSchema), ctrl.listUsers);
router.patch('/users/:id', validate(updateUserSchema), ctrl.updateUser);
router.get('/documents', validate(listDocumentsSchema), ctrl.listDocuments);
router.get('/audit-logs', validate(listAuditSchema), ctrl.listAuditLogs);

module.exports = router;
