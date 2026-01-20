// Test setup file for Jest
// This file runs before all tests

import dotenv from 'dotenv';
import path from 'path';

// Load .env.test file
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Mock environment variables for testing (override if not in .env.test)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// For tests, use DATABASE_URL from .env.test or default to in-memory/mock
// NEVER hardcode production database credentials here!
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Please create a .env.test file with a test database URL.'
  );
}

process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Import prisma after env is loaded
import prisma from '../prisma';

// Test user IDs used by authHelpers
const TEST_USER_IDS = {
  admin: '00000000-0000-0000-0000-000000000001',
  leader: '00000000-0000-0000-0000-000000000002',
  musician: '00000000-0000-0000-0000-000000000003',
};

// Ensure test users exist before running tests
beforeAll(async () => {
  // Create test users if they don't exist (upsert)
  await prisma.user.upsert({
    where: { id: TEST_USER_IDS.admin },
    update: {},
    create: {
      id: TEST_USER_IDS.admin,
      email: 'test-admin@test-fixtures.local',
      name: 'Test Admin',
      roles: ['admin'],
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { id: TEST_USER_IDS.leader },
    update: {},
    create: {
      id: TEST_USER_IDS.leader,
      email: 'test-leader@test-fixtures.local',
      name: 'Test Leader',
      roles: ['leader'],
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { id: TEST_USER_IDS.musician },
    update: {},
    create: {
      id: TEST_USER_IDS.musician,
      email: 'test-musician@test-fixtures.local',
      name: 'Test Musician',
      roles: ['musician'],
      isActive: true,
    },
  });
});

// Disconnect prisma after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
