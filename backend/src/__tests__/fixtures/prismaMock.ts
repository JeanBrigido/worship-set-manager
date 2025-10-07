import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

/**
 * Mock Prisma Client for unit tests
 * This allows us to test controllers without hitting the database
 */

export type MockPrismaClient = DeepMockProxy<PrismaClient>;

// Create a mock instance
const prismaMock = mockDeep<PrismaClient>();

// Reset mock between tests
beforeEach(() => {
  mockReset(prismaMock);
});

export default prismaMock;
