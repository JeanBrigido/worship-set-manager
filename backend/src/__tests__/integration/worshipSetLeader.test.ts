import request from 'supertest';
import express from 'express';
import { Role } from '@prisma/client';
import worshipSetsRouter from '../../routes/worshipSets';
import prisma from '../../prisma';
import { adminToken, leaderToken, musicianToken } from '../fixtures/authHelpers';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/worship-sets', worshipSetsRouter);

describe('Worship Set Leader Assignment Integration Tests', () => {
  let testServiceType: any;
  let testService: any;
  let testWorshipSet: any;
  let testLeaderUser: any;
  let testLeaderUser2: any;
  let testMusicianUser: any;
  let testRotation1: any;
  let testRotation2: any;
  const testId = Date.now().toString();

  beforeAll(async () => {
    // Create test service type
    testServiceType = await prisma.serviceType.create({
      data: {
        id: `test-service-type-ws-${testId}`,
        name: `Test Sunday Service WS ${testId}`,
        defaultStartTime: '09:00',
      },
    });

    // Create test users
    testLeaderUser = await prisma.user.create({
      data: {
        id: `test-leader-ws-1-${testId}`,
        email: `leader1.ws.${testId}@test.com`,
        name: `Test Leader WS 1 ${testId}`,
        roles: [Role.leader],
      },
    });

    testLeaderUser2 = await prisma.user.create({
      data: {
        id: `test-leader-ws-2-${testId}`,
        email: `leader2.ws.${testId}@test.com`,
        name: `Test Leader WS 2 ${testId}`,
        roles: [Role.leader],
      },
    });

    testMusicianUser = await prisma.user.create({
      data: {
        id: `test-musician-ws-1-${testId}`,
        email: `musician.ws.${testId}@test.com`,
        name: `Test Musician WS ${testId}`,
        roles: [Role.musician],
      },
    });

    // Create test service and worship set
    testService = await prisma.service.create({
      data: {
        id: `test-service-ws-1-${testId}`,
        serviceTypeId: testServiceType.id,
        serviceDate: new Date('2025-02-01'),
      },
    });

    testWorshipSet = await prisma.worshipSet.create({
      data: {
        id: `test-worship-set-1-${testId}`,
        serviceId: testService.id,
      },
    });

    // Create rotation entries
    testRotation1 = await prisma.leaderRotation.create({
      data: {
        userId: testLeaderUser.id,
        serviceTypeId: testServiceType.id,
        rotationOrder: 1,
      },
    });

    testRotation2 = await prisma.leaderRotation.create({
      data: {
        userId: testLeaderUser2.id,
        serviceTypeId: testServiceType.id,
        rotationOrder: 2,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.leaderRotation.deleteMany({
      where: { id: { in: [testRotation1.id, testRotation2.id] } },
    });
    await prisma.worshipSet.delete({ where: { id: testWorshipSet.id } });
    await prisma.service.delete({ where: { id: testService.id } });
    await prisma.user.deleteMany({
      where: {
        id: { in: [testLeaderUser.id, testLeaderUser2.id, testMusicianUser.id] },
      },
    });
    await prisma.serviceType.delete({ where: { id: testServiceType.id } });
  });

  afterEach(async () => {
    // Reset worship set leader after each test
    await prisma.worshipSet.update({
      where: { id: testWorshipSet.id },
      data: { leaderUserId: null },
    });
  });

  describe('PUT /worship-sets/:id/assign-leader', () => {
    it('should assign leader to worship set with admin role', async () => {
      const response = await request(app)
        .put(`/worship-sets/${testWorshipSet.id}/assign-leader`)
        .set(adminToken())
        .send({
          leaderUserId: testLeaderUser.id,
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.leaderUserId).toBe(testLeaderUser.id);
      expect(response.body.data.leaderUser).toBeDefined();
      expect(response.body.data.leaderUser.name).toBe(testLeaderUser.name);
    });

    it('should allow reassigning to a different leader', async () => {
      // First assignment
      await prisma.worshipSet.update({
        where: { id: testWorshipSet.id },
        data: { leaderUserId: testLeaderUser.id },
      });

      // Reassign to different leader
      const response = await request(app)
        .put(`/worship-sets/${testWorshipSet.id}/assign-leader`)
        .set(adminToken())
        .send({
          leaderUserId: testLeaderUser2.id,
        })
        .expect(200);

      expect(response.body.data.leaderUserId).toBe(testLeaderUser2.id);
    });

    it('should allow unassigning leader by setting to null', async () => {
      // First assign a leader
      await prisma.worshipSet.update({
        where: { id: testWorshipSet.id },
        data: { leaderUserId: testLeaderUser.id },
      });

      // Unassign
      const response = await request(app)
        .put(`/worship-sets/${testWorshipSet.id}/assign-leader`)
        .set(adminToken())
        .send({
          leaderUserId: null,
        })
        .expect(200);

      expect(response.body.data.leaderUserId).toBeNull();
    });

    it('should reject non-admin users from assigning leaders', async () => {
      await request(app)
        .put(`/worship-sets/${testWorshipSet.id}/assign-leader`)
        .set(leaderToken())
        .send({
          leaderUserId: testLeaderUser.id,
        })
        .expect(403);
    });

    it('should reject assigning user without leader role', async () => {
      const response = await request(app)
        .put(`/worship-sets/${testWorshipSet.id}/assign-leader`)
        .set(adminToken())
        .send({
          leaderUserId: testMusicianUser.id,
        })
        .expect(400);

      expect(response.body.error.message).toContain('leader role');
    });

    it('should return 404 for non-existent worship set', async () => {
      await request(app)
        .put('/worship-sets/00000000-0000-0000-0000-000000000000/assign-leader')
        .set(adminToken())
        .send({
          leaderUserId: testLeaderUser.id,
        })
        .expect(404);
    });

    it('should return 400 for non-existent user', async () => {
      const response = await request(app)
        .put(`/worship-sets/${testWorshipSet.id}/assign-leader`)
        .set(adminToken())
        .send({
          leaderUserId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(400);

      expect(response.body.error.message).toContain('leader role');
    });
  });

  describe('GET /worship-sets/:id/suggested-leader', () => {
    it('should suggest first leader when no previous services', async () => {
      const response = await request(app)
        .get(`/worship-sets/${testWorshipSet.id}/suggested-leader`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data.userId).toBe(testLeaderUser.id);
      expect(response.body.data.rotationOrder).toBe(1);
    });

    it('should suggest next leader based on rotation', async () => {
      // Assign first leader to worship set
      await prisma.worshipSet.update({
        where: { id: testWorshipSet.id },
        data: { leaderUserId: testLeaderUser.id },
      });

      // Create a new service and worship set for suggestion
      const newService = await prisma.service.create({
        data: {
          id: `test-service-ws-2-${testId}`,
          serviceTypeId: testServiceType.id,
          serviceDate: new Date('2025-02-08'),
        },
      });

      const newWorshipSet = await prisma.worshipSet.create({
        data: {
          id: `test-worship-set-2-${testId}`,
          serviceId: newService.id,
        },
      });

      const response = await request(app)
        .get(`/worship-sets/${newWorshipSet.id}/suggested-leader`)
        .set(adminToken())
        .expect(200);

      // Should suggest second leader
      expect(response.body.data.userId).toBe(testLeaderUser2.id);

      // Cleanup
      await prisma.worshipSet.delete({ where: { id: newWorshipSet.id } });
      await prisma.service.delete({ where: { id: newService.id } });
    });

    it('should cycle back to first leader after last in rotation', async () => {
      // Assign second (last) leader to worship set
      await prisma.worshipSet.update({
        where: { id: testWorshipSet.id },
        data: { leaderUserId: testLeaderUser2.id },
      });

      // Create a new service and worship set for suggestion
      const newService = await prisma.service.create({
        data: {
          id: `test-service-ws-3-${testId}`,
          serviceTypeId: testServiceType.id,
          serviceDate: new Date('2025-02-15'),
        },
      });

      const newWorshipSet = await prisma.worshipSet.create({
        data: {
          id: `test-worship-set-3-${testId}`,
          serviceId: newService.id,
        },
      });

      const response = await request(app)
        .get(`/worship-sets/${newWorshipSet.id}/suggested-leader`)
        .set(adminToken())
        .expect(200);

      // Should cycle back to first leader
      expect(response.body.data.userId).toBe(testLeaderUser.id);

      // Cleanup
      await prisma.worshipSet.delete({ where: { id: newWorshipSet.id } });
      await prisma.service.delete({ where: { id: newService.id } });
    });

    it('should return 404 for non-existent worship set', async () => {
      await request(app)
        .get('/worship-sets/00000000-0000-0000-0000-000000000000/suggested-leader')
        .set(adminToken())
        .expect(404);
    });

    it('should return 404 when no rotation exists', async () => {
      // Create a service type without rotations
      const emptyServiceType = await prisma.serviceType.create({
        data: {
          id: `empty-service-type-ws-${testId}`,
          name: `Empty Service Type WS ${testId}`,
          defaultStartTime: '10:00',
        },
      });

      const emptyService = await prisma.service.create({
        data: {
          id: `empty-service-ws-${testId}`,
          serviceTypeId: emptyServiceType.id,
          serviceDate: new Date('2025-03-01'),
        },
      });

      const emptyWorshipSet = await prisma.worshipSet.create({
        data: {
          id: `empty-worship-set-ws-${testId}`,
          serviceId: emptyService.id,
        },
      });

      await request(app)
        .get(`/worship-sets/${emptyWorshipSet.id}/suggested-leader`)
        .set(adminToken())
        .expect(404);

      // Cleanup
      await prisma.worshipSet.delete({ where: { id: emptyWorshipSet.id } });
      await prisma.service.delete({ where: { id: emptyService.id } });
      await prisma.serviceType.delete({ where: { id: emptyServiceType.id } });
    });

    it('should allow leaders to view suggested leader', async () => {
      const response = await request(app)
        .get(`/worship-sets/${testWorshipSet.id}/suggested-leader`)
        .set(leaderToken())
        .expect(200);

      expect(response.body.data.userId).toBe(testLeaderUser.id);
    });

    it('should allow musicians to view suggested leader', async () => {
      const response = await request(app)
        .get(`/worship-sets/${testWorshipSet.id}/suggested-leader`)
        .set(musicianToken())
        .expect(200);

      expect(response.body.data.userId).toBe(testLeaderUser.id);
    });
  });
});
