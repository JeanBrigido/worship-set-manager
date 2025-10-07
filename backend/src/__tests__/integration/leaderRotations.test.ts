import request from 'supertest';
import express from 'express';
import { Role } from '@prisma/client';
import leaderRotationsRouter from '../../routes/leaderRotations';
import prisma from '../../prisma';
import { adminToken, leaderToken, musicianToken } from '../fixtures/authHelpers';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/leader-rotations', leaderRotationsRouter);

describe('Leader Rotations Integration Tests', () => {
  let testServiceType: any;
  let testLeaderUser: any;
  let testLeaderUser2: any;
  let testMusicianUser: any;
  const testId = Date.now().toString();

  beforeAll(async () => {
    // Create test service type
    testServiceType = await prisma.serviceType.create({
      data: {
        id: `test-service-type-rotation-${testId}`,
        name: `Test Sunday Service ${testId}`,
        defaultStartTime: '09:00',
      },
    });

    // Create test users with leader role
    testLeaderUser = await prisma.user.create({
      data: {
        id: `test-leader-rotation-1-${testId}`,
        email: `leader1.rotation.${testId}@test.com`,
        name: `Test Leader 1 ${testId}`,
        roles: [Role.leader],
      },
    });

    testLeaderUser2 = await prisma.user.create({
      data: {
        id: `test-leader-rotation-2-${testId}`,
        email: `leader2.rotation.${testId}@test.com`,
        name: `Test Leader 2 ${testId}`,
        roles: [Role.leader],
      },
    });

    testMusicianUser = await prisma.user.create({
      data: {
        id: `test-musician-rotation-1-${testId}`,
        email: `musician.rotation.${testId}@test.com`,
        name: `Test Musician ${testId}`,
        roles: [Role.musician],
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.leaderRotation.deleteMany({
      where: {
        OR: [
          { userId: testLeaderUser.id },
          { userId: testLeaderUser2.id },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [testLeaderUser.id, testLeaderUser2.id, testMusicianUser.id] },
      },
    });
    await prisma.serviceType.delete({ where: { id: testServiceType.id } });
  });

  describe('GET /leader-rotations', () => {
    let rotation1: any;
    let rotation2: any;

    beforeEach(async () => {
      rotation1 = await prisma.leaderRotation.create({
        data: {
          userId: testLeaderUser.id,
          serviceTypeId: testServiceType.id,
          rotationOrder: 1,
        },
      });

      rotation2 = await prisma.leaderRotation.create({
        data: {
          userId: testLeaderUser2.id,
          serviceTypeId: testServiceType.id,
          rotationOrder: 2,
        },
      });
    });

    afterEach(async () => {
      await prisma.leaderRotation.deleteMany({
        where: { id: { in: [rotation1.id, rotation2.id] } },
      });
    });

    it('should list all rotations with authentication', async () => {
      const response = await request(app)
        .get('/leader-rotations')
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      const rotation = response.body.data.find((r: any) => r.id === rotation1.id);
      expect(rotation).toBeDefined();
      expect(rotation.user).toBeDefined();
      expect(rotation.serviceType).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/leader-rotations')
        .expect(401);
    });
  });

  describe('POST /leader-rotations', () => {
    afterEach(async () => {
      await prisma.leaderRotation.deleteMany({
        where: { serviceTypeId: testServiceType.id },
      });
    });

    it('should create rotation with admin role', async () => {
      const response = await request(app)
        .post('/leader-rotations')
        .set(adminToken())
        .send({
          userId: testLeaderUser.id,
          serviceTypeId: testServiceType.id,
          rotationOrder: 1,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(testLeaderUser.id);
      expect(response.body.data.serviceTypeId).toBe(testServiceType.id);
      expect(response.body.data.rotationOrder).toBe(1);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should reject non-admin users from creating rotations', async () => {
      await request(app)
        .post('/leader-rotations')
        .set(leaderToken())
        .send({
          userId: testLeaderUser.id,
          serviceTypeId: testServiceType.id,
          rotationOrder: 1,
        })
        .expect(403);
    });

    it('should reject creating rotation for non-leader user', async () => {
      const response = await request(app)
        .post('/leader-rotations')
        .set(adminToken())
        .send({
          userId: testMusicianUser.id,
          serviceTypeId: testServiceType.id,
          rotationOrder: 1,
        })
        .expect(400);

      expect(response.body.error.message).toContain('leader role');
    });

    it('should enforce unique rotation order per service type', async () => {
      // Create first rotation
      await prisma.leaderRotation.create({
        data: {
          userId: testLeaderUser.id,
          serviceTypeId: testServiceType.id,
          rotationOrder: 1,
        },
      });

      // Try to create second rotation with same order
      const response = await request(app)
        .post('/leader-rotations')
        .set(adminToken())
        .send({
          userId: testLeaderUser2.id,
          serviceTypeId: testServiceType.id,
          rotationOrder: 1,
        })
        .expect(400);

      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('PUT /leader-rotations/:id', () => {
    let rotation: any;

    beforeEach(async () => {
      rotation = await prisma.leaderRotation.create({
        data: {
          userId: testLeaderUser.id,
          serviceTypeId: testServiceType.id,
          rotationOrder: 1,
        },
      });
    });

    afterEach(async () => {
      await prisma.leaderRotation.deleteMany({
        where: { id: rotation.id },
      });
    });

    it('should update rotation order with admin role', async () => {
      const response = await request(app)
        .put(`/leader-rotations/${rotation.id}`)
        .set(adminToken())
        .send({
          rotationOrder: 3,
        })
        .expect(200);

      expect(response.body.data.rotationOrder).toBe(3);
    });

    it('should update isActive status', async () => {
      const response = await request(app)
        .put(`/leader-rotations/${rotation.id}`)
        .set(adminToken())
        .send({
          isActive: false,
        })
        .expect(200);

      expect(response.body.data.isActive).toBe(false);
    });

    it('should reject non-admin users from updating rotations', async () => {
      await request(app)
        .put(`/leader-rotations/${rotation.id}`)
        .set(musicianToken())
        .send({
          rotationOrder: 2,
        })
        .expect(403);
    });

    it('should return 404 for non-existent rotation', async () => {
      await request(app)
        .put('/leader-rotations/00000000-0000-0000-0000-000000000000')
        .set(adminToken())
        .send({
          rotationOrder: 2,
        })
        .expect(404);
    });
  });

  describe('DELETE /leader-rotations/:id', () => {
    let rotation: any;

    beforeEach(async () => {
      rotation = await prisma.leaderRotation.create({
        data: {
          userId: testLeaderUser.id,
          serviceTypeId: testServiceType.id,
          rotationOrder: 1,
        },
      });
    });

    afterEach(async () => {
      await prisma.leaderRotation.deleteMany({
        where: { id: rotation.id },
      });
    });

    it('should soft delete rotation with admin role', async () => {
      await request(app)
        .delete(`/leader-rotations/${rotation.id}`)
        .set(adminToken())
        .expect(204);

      const deletedRotation = await prisma.leaderRotation.findUnique({
        where: { id: rotation.id },
      });

      expect(deletedRotation?.isActive).toBe(false);
    });

    it('should reject non-admin users from deleting rotations', async () => {
      await request(app)
        .delete(`/leader-rotations/${rotation.id}`)
        .set(leaderToken())
        .expect(403);
    });

    it('should return 404 for non-existent rotation', async () => {
      await request(app)
        .delete('/leader-rotations/00000000-0000-0000-0000-000000000000')
        .set(adminToken())
        .expect(404);
    });
  });

  describe('GET /leader-rotations/next/:serviceTypeId', () => {
    let rotation1: any;
    let rotation2: any;
    let rotation3: any;
    let testService: any;
    let testWorshipSet: any;

    beforeEach(async () => {
      // Create rotation entries
      rotation1 = await prisma.leaderRotation.create({
        data: {
          userId: testLeaderUser.id,
          serviceTypeId: testServiceType.id,
          rotationOrder: 1,
        },
      });

      rotation2 = await prisma.leaderRotation.create({
        data: {
          userId: testLeaderUser2.id,
          serviceTypeId: testServiceType.id,
          rotationOrder: 2,
        },
      });
    });

    afterEach(async () => {
      if (testWorshipSet) await prisma.worshipSet.delete({ where: { id: testWorshipSet.id } });
      if (testService) await prisma.service.delete({ where: { id: testService.id } });
      await prisma.leaderRotation.deleteMany({
        where: { id: { in: [rotation1.id, rotation2.id, rotation3?.id].filter(Boolean) } },
      });
    });

    it('should return first rotation when no previous services', async () => {
      const response = await request(app)
        .get(`/leader-rotations/next/${testServiceType.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data.userId).toBe(testLeaderUser.id);
      expect(response.body.data.rotationOrder).toBe(1);
    });

    it('should return next leader in rotation after previous service', async () => {
      // Create a service with first leader assigned
      testService = await prisma.service.create({
        data: {
          id: `test-service-next-leader-1-${testId}`,
          serviceTypeId: testServiceType.id,
          serviceDate: new Date('2025-01-01'),
        },
      });

      testWorshipSet = await prisma.worshipSet.create({
        data: {
          serviceId: testService.id,
          leaderUserId: testLeaderUser.id,
        },
      });

      const response = await request(app)
        .get(`/leader-rotations/next/${testServiceType.id}`)
        .set(adminToken())
        .expect(200);

      // Should return second leader
      expect(response.body.data.userId).toBe(testLeaderUser2.id);
      expect(response.body.data.rotationOrder).toBe(2);
    });

    it('should cycle back to first leader after last in rotation', async () => {
      // Create a service with second (last) leader assigned
      testService = await prisma.service.create({
        data: {
          id: `test-service-next-leader-2-${testId}`,
          serviceTypeId: testServiceType.id,
          serviceDate: new Date('2025-01-01'),
        },
      });

      testWorshipSet = await prisma.worshipSet.create({
        data: {
          serviceId: testService.id,
          leaderUserId: testLeaderUser2.id,
        },
      });

      const response = await request(app)
        .get(`/leader-rotations/next/${testServiceType.id}`)
        .set(adminToken())
        .expect(200);

      // Should cycle back to first leader
      expect(response.body.data.userId).toBe(testLeaderUser.id);
      expect(response.body.data.rotationOrder).toBe(1);
    });

    it('should return 404 when no rotations exist for service type', async () => {
      const emptyServiceType = await prisma.serviceType.create({
        data: {
          id: `empty-service-type-${testId}`,
          name: `Empty Service Type ${testId}`,
          defaultStartTime: '10:00',
        },
      });

      await request(app)
        .get(`/leader-rotations/next/${emptyServiceType.id}`)
        .set(adminToken())
        .expect(404);

      await prisma.serviceType.delete({ where: { id: emptyServiceType.id } });
    });

    it('should skip inactive rotations', async () => {
      // Deactivate first rotation
      await prisma.leaderRotation.update({
        where: { id: rotation1.id },
        data: { isActive: false },
      });

      const response = await request(app)
        .get(`/leader-rotations/next/${testServiceType.id}`)
        .set(adminToken())
        .expect(200);

      // Should return second leader since first is inactive
      expect(response.body.data.userId).toBe(testLeaderUser2.id);
    });
  });

  describe('GET /leader-rotations/by-service-type/:serviceTypeId', () => {
    let rotation1: any;
    let rotation2: any;

    beforeEach(async () => {
      rotation1 = await prisma.leaderRotation.create({
        data: {
          userId: testLeaderUser.id,
          serviceTypeId: testServiceType.id,
          rotationOrder: 1,
        },
      });

      rotation2 = await prisma.leaderRotation.create({
        data: {
          userId: testLeaderUser2.id,
          serviceTypeId: testServiceType.id,
          rotationOrder: 2,
        },
      });
    });

    afterEach(async () => {
      await prisma.leaderRotation.deleteMany({
        where: { id: { in: [rotation1.id, rotation2.id] } },
      });
    });

    it('should return rotations ordered by rotation order', async () => {
      const response = await request(app)
        .get(`/leader-rotations/by-service-type/${testServiceType.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].rotationOrder).toBe(1);
      expect(response.body.data[1].rotationOrder).toBe(2);
    });

    it('should only return active rotations', async () => {
      await prisma.leaderRotation.update({
        where: { id: rotation1.id },
        data: { isActive: false },
      });

      const response = await request(app)
        .get(`/leader-rotations/by-service-type/${testServiceType.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].userId).toBe(testLeaderUser2.id);
    });
  });
});
