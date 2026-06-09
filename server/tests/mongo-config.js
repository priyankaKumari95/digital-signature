'use strict';

const path = require('path');

const downloadDir = path.resolve(__dirname, '../.cache/mongodb-binaries');
const version = process.env.MONGOMS_VERSION || '7.0.14';

process.env.MONGOMS_DOWNLOAD_DIR = downloadDir;
process.env.MONGOMS_VERSION = version;

module.exports = { downloadDir, version };
