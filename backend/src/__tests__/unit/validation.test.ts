import { z } from 'zod';
import { Role } from '@prisma/client';
import {
  signupSchema,
  loginSchema,
  createUserSchema,
  updateUserSchema,
} from '../../validation/usersSchemas';

describe('Validation Schema Unit Tests', () => {
  describe('Signup Schema Validation', () => {
    it('should validate correct signup data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        phoneE164: '+12345678901',
      };

      const result = signupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject password less than 8 characters', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'short',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters');
      }
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'not-an-email',
        password: 'SecurePass123',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid email');
      }
    });

    it('should reject missing name', () => {
      const invalidData = {
        email: 'john@example.com',
        password: 'SecurePass123',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        email: 'john@example.com',
        password: 'SecurePass123',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Name is required');
      }
    });

    it('should accept valid E.164 phone number', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        phoneE164: '+12345678901',
      };

      const result = signupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid E.164 phone number', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        phoneE164: '1234567890', // Missing +1 prefix
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid +1 E.164 phone');
      }
    });

    it('should allow optional phone number', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
      };

      const result = signupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Login Schema Validation', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'john@example.com',
        password: 'password',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'john@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Create User Schema Validation', () => {
    it('should validate correct user creation data', () => {
      const validData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123',
        phoneE164: '+12345678901',
        roles: [Role.musician],
      };

      const result = createUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should default to musician role if not specified', () => {
      const validData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123',
      };

      const result = createUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.roles).toEqual([Role.musician]);
      }
    });

    it('should accept multiple roles', () => {
      const validData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123',
        roles: [Role.admin, Role.leader],
      };

      const result = createUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.roles).toEqual([Role.admin, Role.leader]);
      }
    });

    it('should enforce password minimum length', () => {
      const invalidData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'short',
        roles: [Role.musician],
      };

      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters');
      }
    });
  });

  describe('Update User Schema Validation', () => {
    it('should validate partial user update', () => {
      const validData = {
        name: 'Updated Name',
      };

      const result = updateUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow updating email only', () => {
      const validData = {
        email: 'newemail@example.com',
      };

      const result = updateUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow updating password only', () => {
      const validData = {
        password: 'NewPassword123',
      };

      const result = updateUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email in update', () => {
      const invalidData = {
        email: 'not-an-email',
      };

      const result = updateUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 8 characters in update', () => {
      const invalidData = {
        password: 'short',
      };

      const result = updateUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters');
      }
    });

    it('should allow updating all fields together', () => {
      const validData = {
        name: 'New Name',
        email: 'newemail@example.com',
        password: 'NewPassword123',
        phoneE164: '+19876543210',
        roles: [Role.leader],
      };

      const result = updateUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Email Format Validation', () => {
    const testEmailValidation = (email: string, shouldBeValid: boolean) => {
      const data = {
        name: 'Test User',
        email,
        password: 'Password123',
      };

      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(shouldBeValid);
    };

    it('should accept standard email formats', () => {
      testEmailValidation('user@example.com', true);
      testEmailValidation('user.name@example.com', true);
      testEmailValidation('user+tag@example.co.uk', true);
    });

    it('should reject invalid email formats', () => {
      testEmailValidation('not-an-email', false);
      testEmailValidation('@example.com', false);
      testEmailValidation('user@', false);
      testEmailValidation('user example.com', false);
    });
  });

  describe('Password Security Requirements', () => {
    const testPasswordValidation = (password: string, shouldBeValid: boolean) => {
      const data = {
        name: 'Test User',
        email: 'test@example.com',
        password,
      };

      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(shouldBeValid);
    };

    it('should accept passwords with 8 or more characters', () => {
      testPasswordValidation('12345678', true);
      testPasswordValidation('Password123', true);
      testPasswordValidation('VeryLongPassword123456', true);
    });

    it('should reject passwords with less than 8 characters', () => {
      testPasswordValidation('1234567', false);
      testPasswordValidation('short', false);
      testPasswordValidation('Pass1', false);
    });
  });
});
