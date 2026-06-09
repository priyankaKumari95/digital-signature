'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { ensureMongod } = require('./mongo-binary');

const PORT = process.env.MONGO_PORT || '27017';
const dataDir = path.resolve(__dirname, '../.cache/mongo-data');

async function main() {
  console.log('Preparing local MongoDB…');
  const binPath = await ensureMongod({ log: (m) => console.log(m) });
  fs.mkdirSync(dataDir, { recursive: true });

  console.log('\nStarting MongoDB:');
  console.log(`  binary: ${binPath}`);
  console.log(`  data:   ${dataDir}`);
  console.log(`  uri:    mongodb://127.0.0.1:${PORT}`);
  console.log('\nLeave this running. Press Ctrl+C to stop.\n');

  const mongod = spawn(
    binPath,
    ['--dbpath', dataDir, '--port', String(PORT), '--bind_ip', '127.0.0.1'],
    { stdio: 'inherit' }
  );

  const stop = () => {
    mongod.kill('SIGINT');
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  mongod.on('exit', (code) => process.exit(code == null ? 0 : code));
}

main().catch((err) => {
  console.error('Failed to start MongoDB:', err);
  process.exit(1);
});
