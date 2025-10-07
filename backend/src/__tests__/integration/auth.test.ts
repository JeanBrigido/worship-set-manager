import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import usersRouter from '../../routes/users';
import prisma from '../../prisma';
import { verifyToken } from '../../utils/jwt';
import { testUsers, validSignupData, validLoginData } from '../fixtures/testData';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/users', usersRouter);

describe('Authentication Integration Tests', () => {
  describe('POST /users/signup', () => {
    beforeEach(async () => {
      // Clean up test data before each test to ensure clean state
      // First delete related records that have foreign keys to User
      const testUsers = await prisma.user.findMany({
        where: { email: { contains: 'test.com' } },
        select: { id: true },
      });
      const testUserIds = testUsers.map(u => u.id);

      if (testUserIds.length > 0) {
        // Delete leader rotations
        await prisma.leaderRotation.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Delete suggestion slots
        await prisma.suggestionSlot.deleteMany({
          where: { assignedUserId: { in: testUserIds } },
        });

        // Delete assignments
        await prisma.assignment.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Delete availability
        await prisma.availability.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Delete default assignments
        await prisma.defaultAssignment.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Delete notification logs
        await prisma.notificationLog.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Delete accounts
        await prisma.account.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Delete sessions
        await prisma.session.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Finally delete users
        await prisma.user.deleteMany({
          where: { id: { in: testUserIds } },
        });
      }
    });

    afterEach(async () => {
      // Cleanup test data after each test
      const testUsers = await prisma.user.findMany({
        where: { email: { contains: 'test.com' } },
        select: { id: true },
      });
      const testUserIds = testUsers.map(u => u.id);

      if (testUserIds.length > 0) {
        // Delete leader rotations
        await prisma.leaderRotation.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Delete suggestion slots
        await prisma.suggestionSlot.deleteMany({
          where: { assignedUserId: { in: testUserIds } },
        });

        // Delete assignments
        await prisma.assignment.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Delete availability
        await prisma.availability.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Delete default assignments
        await prisma.defaultAssignment.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Delete notification logs
        await prisma.notificationLog.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Delete accounts
        await prisma.account.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Delete sessions
        await prisma.session.deleteMany({
          where: { userId: { in: testUserIds } },
        });

        // Finally delete users
        await prisma.user.deleteMany({
          where: { id: { in: testUserIds } },
        });
      }
    });

    it('should create a new user with valid data', async () => {
      const response = await request(app)
        .post('/users/signup')
        .send(validSignupData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(validSignupData.email);
      expect(response.body.name).toBe(validSignupData.name);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should hash the password before storing', async () => {
      const response = await request(app)
        .post('/users/signup')
        .send(validSignupData)
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: validSignupData.email },
      });

      expect(user).toBeTruthy();
      expect(user?.password).not.toBe(validSignupData.password);

      if (user?.password) {
        const isValid = await bcrypt.compare(validSignupData.password, user.password);
        expect(isValid).toBe(true);
      }
    });

    it('should reject signup with password less than 8 characters', async () => {
      const response = await request(app)
        .post('/users/signup')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'short',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject signup with invalid email format', async () => {
      const response = await request(app)
        .post('/users/signup')
        .send({
          name: 'Test User',
          email: 'not-an-email',
          password: 'ValidPass123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should enforce rate limiting after 3 signup attempts', async () => {
      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/users/signup')
          .send({
            name: 'Test User',
            email: `test${i}@test.com`,
            password: 'ValidPass123',
          });
      }

      // 4th request should be rate limited
      const response = await request(app)
        .post('/users/signup')
        .send({
          name: 'Test User',
          email: 'test4@test.com',
          password: 'ValidPass123',
        })
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Too many signup attempts');
    }, 10000);
  });

  describe('POST /users/login', () => {
    let testUser: any;

    beforeEach(async () => {
      // Clean up any existing test user first
      await prisma.user.deleteMany({
        where: { email: testUsers.admin.email },
      });

      // Create a test user for login tests
      const hashedPassword = await bcrypt.hash(testUsers.admin.password, 10);
      testUser = await prisma.user.create({
        data: {
          id: testUsers.admin.id,
          email: testUsers.admin.email,
          password: hashedPassword,
          name: testUsers.admin.name,
          phoneE164: testUsers.admin.phoneE164,
          roles: testUsers.admin.roles,
        },
      });
    });

    afterEach(async () => {
      await prisma.user.deleteMany({
        where: { email: testUsers.admin.email },
      });
    });

    it('should login with valid credentials and return JWT token', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({
          email: testUsers.admin.email,
          password: testUsers.admin.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUsers.admin.email);
      expect(response.body.user.roles).toEqual(testUsers.admin.roles);

      // Verify token is valid
      const decoded = verifyToken(response.body.token);
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('roles');
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({
          email: testUsers.admin.email,
          password: 'WrongPassword123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SomePassword123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should enforce rate limiting after 5 login attempts', async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/users/login')
          .send({
            email: testUsers.admin.email,
            password: 'WrongPassword',
          });
      }

      // 6th request should be rate limited
      const response = await request(app)
        .post('/users/login')
        .send({
          email: testUsers.admin.email,
          password: testUsers.admin.password,
        })
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Too many login attempts');
    }, 10000);
  });

  describe('JWT Token Validation', () => {
    let testUser: any;
    let validToken: string;

    beforeAll(async () => {
      const hashedPassword = await bcrypt.hash(testUsers.leader.password, 10);
      testUser = await prisma.user.create({
        data: {
          id: testUsers.leader.id,
          email: testUsers.leader.email,
          password: hashedPassword,
          name: testUsers.leader.name,
          phoneE164: testUsers.leader.phoneE164,
          roles: testUsers.leader.roles,
        },
      });

      // Get a valid token
      const loginResponse = await request(app)
        .post('/users/login')
        .send({
          email: testUsers.leader.email,
          password: testUsers.leader.password,
        });

      validToken = loginResponse.body.token;
    });

    afterAll(async () => {
      await prisma.user.delete({ where: { id: testUser.id } });
    });

    it('should access protected route with valid JWT token', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.email).toBe(testUsers.leader.email);
      expect(response.body.roles).toEqual(testUsers.leader.roles);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/users/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Missing token');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid token');
    });

    it('should reject request with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
