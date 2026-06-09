'use strict';

const { connectDB, disconnectDB } = require('./config/db');
const User = require('./models/User');
const { ROLES } = require('./utils/constants');
const logger = require('./utils/logger');

const accounts = [
  {
    name: 'Platform Admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@digisign.local',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    role: ROLES.ADMIN,
  },
  {
    name: 'Demo User',
    email: process.env.SEED_USER_EMAIL || 'demo@digisign.local',
    password: process.env.SEED_USER_PASSWORD || 'Demo@12345',
    role: ROLES.USER,
  },
];

async function seed() {
  await connectDB();
  for (const acc of accounts) {
    const existing = await User.findOne({ email: acc.email });
    if (existing) {
      logger.info(`Skipping existing account: ${acc.email}`);
      continue;
    }
    await User.create(acc);
    logger.info(`Created ${acc.role}: ${acc.email}`);
  }
  await disconnectDB();
  logger.info('Seeding complete.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Seeding failed:', err);
    process.exit(1);
  });
