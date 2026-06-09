'use strict';

const express = require('express');
const authRoutes = require('./auth.routes');
const documentRoutes = require('./document.routes');
const signatureRoutes = require('./signature.routes');
const verificationRoutes = require('./verification.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/signatures', signatureRoutes);
router.use('/verify', verificationRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
