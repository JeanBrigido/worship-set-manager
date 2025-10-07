// Test setup file for Jest
// This file runs before all tests

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';

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
