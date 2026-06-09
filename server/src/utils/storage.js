'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { config } = require('../config/env');

function ensureDir() {
  fs.mkdirSync(config.uploads.dir, { recursive: true });
}

function resolveKey(key) {
  // guard against path traversal: only a bare filename is allowed
  const safe = path.basename(key);
  return path.join(config.uploads.dir, safe);
}

function generateKey(suffix = '', ext = '.pdf') {
  const id = crypto.randomBytes(16).toString('hex');
  return `${id}${suffix}${ext}`;
}

async function save(buffer, { suffix = '', ext = '.pdf' } = {}) {
  ensureDir();
  const key = generateKey(suffix, ext);
  await fsp.writeFile(resolveKey(key), buffer);
  return key;
}

async function read(key) {
  return fsp.readFile(resolveKey(key));
}

async function remove(key) {
  if (!key) return;
  try {
    await fsp.unlink(resolveKey(key));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

function exists(key) {
  return fs.existsSync(resolveKey(key));
}

module.exports = { ensureDir, resolveKey, generateKey, save, read, remove, exists };
