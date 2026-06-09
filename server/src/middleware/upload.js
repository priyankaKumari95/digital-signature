'use strict';

const multer = require('multer');
const { config } = require('../config/env');
const AppError = require('../utils/AppError');

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (file.mimetype !== 'application/pdf') {
    return cb(AppError.badRequest('Only PDF files are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.uploads.maxFileSizeBytes, files: 1 },
});

module.exports = { uploadSinglePdf: upload.single('file') };
