// Test setup file for Jest
// This file runs before all tests

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
// Use Supabase hosted database for tests (same as production)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.alnclerrwasslbefywjx:ltx5qENR5e8Ecm2o@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(10000);
