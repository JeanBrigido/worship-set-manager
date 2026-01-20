import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import usersRouter from '../../routes/users';
import servicesRouter from '../../routes/services';
import prisma from '../../prisma';
import { testUsers } from '../fixtures/testData';
import { adminToken, leaderToken, musicianToken } from '../fixtures/authHelpers';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/users', usersRouter);
app.use('/services', servicesRouter);

describe('Authorization & Role-Based Access Control Tests', () => {
  let adminUser: any;
  let leaderUser: any;
  let musicianUser: any;
  const testId = Date.now().toString() + Math.random().toString(36).substring(7);

  beforeEach(async () => {
    // Create test users with different roles using unique IDs
    const adminPassword = await bcrypt.hash(testUsers.admin.password, 10);
    adminUser = await prisma.user.create({
      data: {
        id: `${testUsers.admin.id}-${testId}`,
        email: `admin.${testId}@test.com`,
        password: adminPassword,
        name: `${testUsers.admin.name} ${testId}`,
        phoneE164: testUsers.admin.phoneE164,
        roles: [Role.admin],
      },
    });

    const leaderPassword = await bcrypt.hash(testUsers.leader.password, 10);
    leaderUser = await prisma.user.create({
      data: {
        id: `${testUsers.leader.id}-${testId}`,
        email: `leader.${testId}@test.com`,
        password: leaderPassword,
        name: `${testUsers.leader.name} ${testId}`,
        phoneE164: testUsers.leader.phoneE164,
        roles: [Role.leader],
      },
    });

    const musicianPassword = await bcrypt.hash(testUsers.musician.password, 10);
    musicianUser = await prisma.user.create({
      data: {
        id: `${testUsers.musician.id}-${testId}`,
        email: `musician.${testId}@test.com`,
        password: musicianPassword,
        name: `${testUsers.musician.name} ${testId}`,
        phoneE164: testUsers.musician.phoneE164,
        roles: [Role.musician],
      },
    });
  });

  afterEach(async () => {
    // Cleanup after each test to ensure isolation
    const userIds = [adminUser?.id, leaderUser?.id, musicianUser?.id].filter(Boolean);

    if (userIds.length > 0) {
      // Delete assignments first
      await prisma.assignment.deleteMany({
        where: { userId: { in: userIds } },
      });

      // Then delete users
      await prisma.user.deleteMany({
        where: {
          id: { in: userIds },
        },
      });
    }
  });

  describe('Admin-Only Endpoints', () => {
    it('should allow admin to list all users', async () => {
      const response = await request(app)
        .get('/users')
        .set(adminToken())
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should reject leader from listing all users', async () => {
      const response = await request(app)
        .get('/users')
        .set(leaderToken())
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Forbidden');
    });

    it('should reject musician from listing all users', async () => {
      const response = await request(app)
        .get('/users')
        .set(musicianToken())
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Forbidden');
    });

    it('should allow admin to create a new user', async () => {
      const response = await request(app)
        .post('/users')
        .set(adminToken())
        .send({
          name: 'Admin Created User',
          email: 'admincreated@test.com',
          password: 'Password123',
          roles: [Role.musician],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('admincreated@test.com');

      // Cleanup
      await prisma.user.delete({ where: { email: 'admincreated@test.com' } });
    });

    it('should reject non-admin from creating users', async () => {
      const response = await request(app)
        .post('/users')
        .set(leaderToken())
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'Password123',
          roles: [Role.musician],
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Forbidden');
    });

    it('should allow admin to delete a user', async () => {
      // Create a user to delete
      const userToDelete = await prisma.user.create({
        data: {
          name: 'Delete Me',
          email: 'deleteme@test.com',
          password: await bcrypt.hash('Password123', 10),
          roles: [Role.musician],
        },
      });

      await request(app)
        .delete(`/users/${userToDelete.id}`)
        .set(adminToken())
        .expect(204);

      // Verify user is deleted
      const deletedUser = await prisma.user.findUnique({
        where: { id: userToDelete.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should reject non-admin from deleting users', async () => {
      const response = await request(app)
        .delete(`/users/${musicianUser.id}`)
        .set(musicianToken())
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Forbidden');
    });
  });

  describe('Leader/Admin Endpoints', () => {
    it('should allow admin to create a service', async () => {
      const serviceType = await prisma.serviceType.findFirst();

      if (!serviceType) {
        // Skip test if no service types exist
        return;
      }

      const response = await request(app)
        .post('/services')
        .set(adminToken())
        .send({
          date: new Date().toISOString(),
          serviceTypeId: serviceType.id,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');

      // Cleanup - delete WorshipSet first due to foreign key
      await prisma.worshipSet.deleteMany({ where: { serviceId: response.body.id } });
      await prisma.service.delete({ where: { id: response.body.id } });
    });

    it('should allow leader to create a service', async () => {
      const serviceType = await prisma.serviceType.findFirst();

      if (!serviceType) {
        return;
      }

      const response = await request(app)
        .post('/services')
        .set(leaderToken())
        .send({
          date: new Date().toISOString(),
          serviceTypeId: serviceType.id,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');

      // Cleanup - delete WorshipSet first due to foreign key
      await prisma.worshipSet.deleteMany({ where: { serviceId: response.body.id } });
      await prisma.service.delete({ where: { id: response.body.id } });
    });

    it('should reject musician from creating services', async () => {
      const serviceType = await prisma.serviceType.findFirst();

      if (!serviceType) {
        return;
      }

      const response = await request(app)
        .post('/services')
        .set(musicianToken())
        .send({
          date: new Date().toISOString(),
          serviceTypeId: serviceType.id,
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Self-Access vs Admin Access', () => {
    it('should allow user to view their own profile', async () => {
      const response = await request(app)
        .get(`/users/${musicianUser.id}`)
        .set(musicianToken())
        .expect(200);

      expect(response.body.data.id).toBe(musicianUser.id);
      expect(response.body.data.email).toBe(musicianUser.email);
    });

    it('should reject user from viewing another user profile', async () => {
      const response = await request(app)
        .get(`/users/${adminUser.id}`)
        .set(musicianToken())
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Forbidden');
    });

    it('should allow admin to view any user profile', async () => {
      const response = await request(app)
        .get(`/users/${musicianUser.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data.id).toBe(musicianUser.id);
    });
  });

  describe('Unauthorized Access', () => {
    it('should reject requests without authentication token', async () => {
      await request(app)
        .get('/users')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app)
        .get('/users')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);
    });
  });
});
