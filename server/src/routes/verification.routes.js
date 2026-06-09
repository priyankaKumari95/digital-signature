'use strict';

const express = require('express');
const ctrl = require('../controllers/verification.controller');
const validate = require('../middleware/validate');
const { verifyLimiter } = require('../middleware/rateLimiter');
const { verificationIdParam } = require('../validators/verification.validators');

const router = express.Router();

router.use(verifyLimiter);
router.get('/:verificationId', validate(verificationIdParam), ctrl.verify);
router.get('/:verificationId/download', validate(verificationIdParam), ctrl.download);

module.exports = router;
