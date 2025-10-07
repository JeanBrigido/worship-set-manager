import { Role } from '@prisma/client';
import { signToken } from '../../utils/jwt';

/**
 * Helper functions for authentication in tests
 */

export interface TestJwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * Generate a valid JWT token for testing
 */
export function generateTestToken(payload: TestJwtPayload): string {
  return signToken(payload);
}

/**
 * Generate a Bearer token header for supertest requests
 */
export function authHeader(payload: TestJwtPayload): { Authorization: string } {
  const token = generateTestToken(payload);
  return { Authorization: `Bearer ${token}` };
}

/**
 * Generate admin token for testing
 */
export function adminToken(): { Authorization: string } {
  return authHeader({
    userId: '00000000-0000-0000-0000-000000000001',
    roles: [Role.admin],
  });
}

/**
 * Generate leader token for testing
 */
export function leaderToken(): { Authorization: string } {
  return authHeader({
    userId: '00000000-0000-0000-0000-000000000002',
    roles: [Role.leader],
  });
}

/**
 * Generate musician token for testing
 */
export function musicianToken(): { Authorization: string } {
  return authHeader({
    userId: '00000000-0000-0000-0000-000000000003',
    roles: [Role.musician],
  });
}

/**
 * Generate an expired token for testing
 */
export function expiredToken(): { Authorization: string } {
  const token = signToken(
    {
      userId: '00000000-0000-0000-0000-000000000001',
      roles: [Role.admin],
    },
    { expiresIn: '-1h' }
  );
  return { Authorization: `Bearer ${token}` };
}

/**
 * Generate an invalid token for testing
 */
export function invalidToken(): { Authorization: string } {
  return { Authorization: 'Bearer invalid.token.here' };
}
