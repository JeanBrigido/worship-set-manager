import { Role } from '@prisma/client';

/**
 * Test data fixtures for authentication and user tests
 */

export const testUsers = {
  admin: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@test.com',
    password: 'AdminPass123',
    name: 'Test Admin',
    phoneE164: '+11234567890',
    roles: [Role.admin],
  },
  leader: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'leader@test.com',
    password: 'LeaderPass123',
    name: 'Test Leader',
    phoneE164: '+11234567891',
    roles: [Role.leader],
  },
  musician: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'musician@test.com',
    password: 'MusicianPass123',
    name: 'Test Musician',
    phoneE164: '+11234567892',
    roles: [Role.musician],
  },
};

export const validSignupData = {
  name: 'New User',
  email: 'newuser@test.com',
  password: 'ValidPass123',
  phoneE164: '+11234567899',
};

export const invalidSignupData = {
  tooShortPassword: {
    name: 'Test User',
    email: 'test@test.com',
    password: 'short',
  },
  invalidEmail: {
    name: 'Test User',
    email: 'not-an-email',
    password: 'ValidPass123',
  },
  missingName: {
    email: 'test@test.com',
    password: 'ValidPass123',
  },
};

export const validLoginData = {
  email: 'admin@test.com',
  password: 'AdminPass123',
};

export const invalidLoginData = {
  wrongPassword: {
    email: 'admin@test.com',
    password: 'WrongPassword',
  },
  nonExistentUser: {
    email: 'nonexistent@test.com',
    password: 'SomePassword123',
  },
};
