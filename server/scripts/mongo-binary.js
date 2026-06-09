'use strict';

require('../tests/mongo-config');

const fs = require('fs');
const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const { MongoBinary } = require('mongodb-memory-server-core/lib/util/MongoBinary');

const DLL_SOURCE_DIRS = [
  'C:/Program Files/Android/Android Studio/jbr/bin',
  path.join(process.env.LOCALAPPDATA || '', 'Programs/Microsoft VS Code'),
];
const REQUIRED_DLLS = ['vcruntime140.dll', 'vcruntime140_1.dll', 'msvcp140.dll'];

function findDll(name) {
  for (const dir of DLL_SOURCE_DIRS) {
    const direct = path.join(dir, name);
    if (fs.existsSync(direct)) return direct;
    if (fs.existsSync(dir)) {
      const stack = [dir];
      let scanned = 0;
      while (stack.length && scanned < 4000) {
        const cur = stack.pop();
        scanned += 1;
        let entries = [];
        try {
          entries = fs.readdirSync(cur, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const e of entries) {
          const full = path.join(cur, e.name);
          if (e.isFile() && e.name.toLowerCase() === name) return full;
          if (e.isDirectory()) stack.push(full);
        }
      }
    }
  }
  return null;
}

async function ensureMongod({ log = () => {} } = {}) {
  const binPath = await MongoBinary.getPath();
  if (process.platform === 'win32') {
    const binDir = path.dirname(binPath);
    for (const dll of REQUIRED_DLLS) {
      const dest = path.join(binDir, dll);
      if (fs.existsSync(dest)) continue;
      const src = findDll(dll);
      if (src) {
        fs.copyFileSync(src, dest);
        log(`  ✓ copied ${dll}`);
      } else {
        log(`  ! could not locate ${dll} — mongod may fail to start`);
      }
    }
  }
  return binPath;
}

module.exports = { ensureMongod };
