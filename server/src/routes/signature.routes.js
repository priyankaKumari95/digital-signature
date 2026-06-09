'use strict';

const express = require('express');
const ctrl = require('../controllers/signature.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { idParam } = require('../validators/common.validators');
const { createSchema } = require('../validators/signature.validators');

const router = express.Router();

router.use(protect);

router.post('/', validate(createSchema), ctrl.create);
router.get('/', ctrl.list);
router.delete('/:id', validate(idParam), ctrl.remove);

module.exports = router;
