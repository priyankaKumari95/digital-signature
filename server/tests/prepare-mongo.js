'use strict';

const { ensureMongod } = require('../scripts/mongo-binary');

ensureMongod({ log: (m) => console.log(m) })
  .then((binPath) => {
    console.log(`mongod is ready for tests: ${binPath}`);
  })
  .catch((err) => {
    console.error('Failed to prepare mongod:', err);
    process.exit(1);
  });
