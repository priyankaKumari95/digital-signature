'use strict';

const express = require('express');
const ctrl = require('../controllers/document.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { uploadSinglePdf } = require('../middleware/upload');
const { uploadSchema, listSchema, idSchema, downloadSchema } = require('../validators/document.validators');
const { signSchema } = require('../validators/signing.validators');

const router = express.Router();

router.use(protect);

router.post('/', uploadSinglePdf, validate(uploadSchema), ctrl.upload);
router.get('/', validate(listSchema), ctrl.list);
router.get('/:id', validate(idSchema), ctrl.getOne);
router.get('/:id/file', validate(downloadSchema), ctrl.view);
router.get('/:id/download', validate(downloadSchema), ctrl.download);
router.post('/:id/sign', validate(signSchema), ctrl.sign);
router.delete('/:id', validate(idSchema), ctrl.remove);

module.exports = router;
