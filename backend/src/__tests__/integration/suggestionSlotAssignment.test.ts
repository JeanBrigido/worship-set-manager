import request from 'supertest';
import express from 'express';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import suggestionSlotsRouter from '../../routes/suggestionSlots';
import prisma from '../../prisma';
import { adminToken, leaderToken, musicianToken } from '../fixtures/authHelpers';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/suggestion-slots', suggestionSlotsRouter);

describe('Suggestion Slot Assignment Integration Tests', () => {
  let testServiceType: any;
  let testService: any;
  let testWorshipSet: any;
  let testUser1: any;
  let testUser2: any;
  let testMusicianUser: any;
  const testUniqueId = randomUUID().slice(0, 8);

  beforeAll(async () => {
    // Create test service type
    testServiceType = await prisma.serviceType.create({
      data: {
        id: randomUUID(),
        name: `Test Sunday Service Slot ${testUniqueId}`,
        defaultStartTime: '09:00',
      },
    });

    // Create test users
    testUser1 = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `user1.slot.${testUniqueId}@test.com`,
        name: `Test User Slot 1 ${testUniqueId}`,
        roles: [Role.musician],
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `user2.slot.${testUniqueId}@test.com`,
        name: `Test User Slot 2 ${testUniqueId}`,
        roles: [Role.leader],
      },
    });

    testMusicianUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `musician.slot.${testUniqueId}@test.com`,
        name: `Test Musician Slot ${testUniqueId}`,
        roles: [Role.musician],
      },
    });

    // Create test service and worship set
    testService = await prisma.service.create({
      data: {
        id: randomUUID(),
        serviceTypeId: testServiceType.id,
        serviceDate: new Date('2025-03-01'),
      },
    });

    testWorshipSet = await prisma.worshipSet.create({
      data: {
        id: randomUUID(),
        serviceId: testService.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup - delete in order to respect foreign key constraints
    if (testWorshipSet?.id) {
      await prisma.suggestionSlot.deleteMany({ where: { setId: testWorshipSet.id } }).catch(() => {});
      await prisma.worshipSet.delete({ where: { id: testWorshipSet.id } }).catch(() => {});
    }
    if (testService?.id) {
      await prisma.service.delete({ where: { id: testService.id } }).catch(() => {});
    }
    const userIds = [testUser1?.id, testUser2?.id, testMusicianUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    }
    if (testServiceType?.id) {
      await prisma.serviceType.delete({ where: { id: testServiceType.id } }).catch(() => {});
    }
  });

  describe('PUT /suggestion-slots/:id/assign-user', () => {
    let suggestionSlot: any;

    beforeEach(async () => {
      // Create a suggestion slot
      suggestionSlot = await prisma.suggestionSlot.create({
        data: {
          setId: testWorshipSet.id,
          assignedUserId: testUser1.id,
          minSongs: 1,
          maxSongs: 3,
          dueAt: new Date('2025-02-28'),
        },
      });
    });

    afterEach(async () => {
      await prisma.suggestionSlot.deleteMany({
        where: { id: suggestionSlot.id },
      });
    });

    it('should assign user to suggestion slot with admin role', async () => {
      const response = await request(app)
        .put(`/suggestion-slots/${suggestionSlot.id}/assign-user`)
        .set(adminToken())
        .send({
          assignedUserId: testUser2.id,
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.assignedUserId).toBe(testUser2.id);
      expect(response.body.data.assignedUser).toBeDefined();
      expect(response.body.data.assignedUser.name).toBe(testUser2.name);
    });

    it('should assign user to suggestion slot with leader role', async () => {
      const response = await request(app)
        .put(`/suggestion-slots/${suggestionSlot.id}/assign-user`)
        .set(leaderToken())
        .send({
          assignedUserId: testUser2.id,
        })
        .expect(200);

      expect(response.body.data.assignedUserId).toBe(testUser2.id);
    });

    it('should reject musician from assigning users', async () => {
      await request(app)
        .put(`/suggestion-slots/${suggestionSlot.id}/assign-user`)
        .set(musicianToken())
        .send({
          assignedUserId: testUser2.id,
        })
        .expect(403);
    });

    it('should return 400 for non-existent user', async () => {
      const response = await request(app)
        .put(`/suggestion-slots/${suggestionSlot.id}/assign-user`)
        .set(adminToken())
        .send({
          assignedUserId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(400);

      expect(response.body.error.message).toContain('not found');
    });

    it('should return 404 for non-existent suggestion slot', async () => {
      await request(app)
        .put('/suggestion-slots/00000000-0000-0000-0000-000000000000/assign-user')
        .set(adminToken())
        .send({
          assignedUserId: testUser2.id,
        })
        .expect(404);
    });

    it('should return updated slot with worship set and service details', async () => {
      const response = await request(app)
        .put(`/suggestion-slots/${suggestionSlot.id}/assign-user`)
        .set(adminToken())
        .send({
          assignedUserId: testUser2.id,
        })
        .expect(200);

      expect(response.body.data.worshipSet).toBeDefined();
      expect(response.body.data.worshipSet.service).toBeDefined();
    });
  });

  describe('POST /suggestion-slots (Admin/Leader only)', () => {
    afterEach(async () => {
      await prisma.suggestionSlot.deleteMany({
        where: { setId: testWorshipSet.id },
      });
    });

    it('should create suggestion slot with admin role', async () => {
      const dueAt = new Date('2025-02-28').toISOString();

      const response = await request(app)
        .post('/suggestion-slots')
        .set(adminToken())
        .send({
          setId: testWorshipSet.id,
          assignedUserId: testUser1.id,
          minSongs: 2,
          maxSongs: 4,
          dueAt,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.assignedUserId).toBe(testUser1.id);
      expect(response.body.data.minSongs).toBe(2);
      expect(response.body.data.maxSongs).toBe(4);
    });

    it('should create suggestion slot with leader role', async () => {
      const dueAt = new Date('2025-02-28').toISOString();

      const response = await request(app)
        .post('/suggestion-slots')
        .set(leaderToken())
        .send({
          setId: testWorshipSet.id,
          assignedUserId: testUser1.id,
          minSongs: 1,
          maxSongs: 3,
          dueAt,
        })
        .expect(201);

      expect(response.body.data.assignedUserId).toBe(testUser1.id);
    });

    it('should reject musician from creating suggestion slots', async () => {
      const dueAt = new Date('2025-02-28').toISOString();

      await request(app)
        .post('/suggestion-slots')
        .set(musicianToken())
        .send({
          setId: testWorshipSet.id,
          assignedUserId: testUser1.id,
          minSongs: 1,
          maxSongs: 3,
          dueAt,
        })
        .expect(403);
    });
  });

  describe('PUT /suggestion-slots/:id (Admin/Leader only)', () => {
    let suggestionSlot: any;

    beforeEach(async () => {
      suggestionSlot = await prisma.suggestionSlot.create({
        data: {
          setId: testWorshipSet.id,
          assignedUserId: testUser1.id,
          minSongs: 1,
          maxSongs: 3,
          dueAt: new Date('2025-02-28'),
        },
      });
    });

    afterEach(async () => {
      await prisma.suggestionSlot.deleteMany({
        where: { id: suggestionSlot.id },
      });
    });

    it('should update suggestion slot with admin role', async () => {
      const newDueAt = new Date('2025-03-05').toISOString();

      const response = await request(app)
        .put(`/suggestion-slots/${suggestionSlot.id}`)
        .set(adminToken())
        .send({
          minSongs: 2,
          maxSongs: 5,
          dueAt: newDueAt,
        })
        .expect(200);

      expect(response.body.data.minSongs).toBe(2);
      expect(response.body.data.maxSongs).toBe(5);
    });

    it('should update suggestion slot status', async () => {
      const response = await request(app)
        .put(`/suggestion-slots/${suggestionSlot.id}`)
        .set(adminToken())
        .send({
          status: 'submitted',
        })
        .expect(200);

      expect(response.body.data.status).toBe('submitted');
    });

    it('should reject musician from updating suggestion slots', async () => {
      await request(app)
        .put(`/suggestion-slots/${suggestionSlot.id}`)
        .set(musicianToken())
        .send({
          minSongs: 2,
        })
        .expect(403);
    });
  });

  describe('DELETE /suggestion-slots/:id (Admin/Leader only)', () => {
    let suggestionSlot: any;

    beforeEach(async () => {
      suggestionSlot = await prisma.suggestionSlot.create({
        data: {
          setId: testWorshipSet.id,
          assignedUserId: testUser1.id,
          minSongs: 1,
          maxSongs: 3,
          dueAt: new Date('2025-02-28'),
        },
      });
    });

    afterEach(async () => {
      await prisma.suggestionSlot.deleteMany({
        where: { id: suggestionSlot.id },
      });
    });

    it('should delete suggestion slot with admin role', async () => {
      await request(app)
        .delete(`/suggestion-slots/${suggestionSlot.id}`)
        .set(adminToken())
        .expect(204);

      const deleted = await prisma.suggestionSlot.findUnique({
        where: { id: suggestionSlot.id },
      });

      expect(deleted).toBeNull();
    });

    it('should delete suggestion slot with leader role', async () => {
      await request(app)
        .delete(`/suggestion-slots/${suggestionSlot.id}`)
        .set(leaderToken())
        .expect(204);
    });

    it('should reject musician from deleting suggestion slots', async () => {
      await request(app)
        .delete(`/suggestion-slots/${suggestionSlot.id}`)
        .set(musicianToken())
        .expect(403);
    });
  });

  describe('GET /suggestion-slots/set/:setId', () => {
    let slot1: any;
    let slot2: any;

    beforeEach(async () => {
      slot1 = await prisma.suggestionSlot.create({
        data: {
          setId: testWorshipSet.id,
          assignedUserId: testUser1.id,
          minSongs: 1,
          maxSongs: 2,
          dueAt: new Date('2025-02-28'),
        },
      });

      slot2 = await prisma.suggestionSlot.create({
        data: {
          setId: testWorshipSet.id,
          assignedUserId: testUser2.id,
          minSongs: 2,
          maxSongs: 3,
          dueAt: new Date('2025-02-28'),
        },
      });
    });

    afterEach(async () => {
      await prisma.suggestionSlot.deleteMany({
        where: { id: { in: [slot1.id, slot2.id] } },
      });
    });

    it('should list all slots for a worship set', async () => {
      const response = await request(app)
        .get(`/suggestion-slots/set/${testWorshipSet.id}`)
        .set(adminToken())
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    it('should include assigned user and suggestions in response', async () => {
      const response = await request(app)
        .get(`/suggestion-slots/set/${testWorshipSet.id}`)
        .set(adminToken())
        .expect(200);

      const slot = response.body.data[0];
      expect(slot.assignedUser).toBeDefined();
      expect(slot.suggestions).toBeDefined();
    });

    it('should allow any authenticated user to view slots', async () => {
      await request(app)
        .get(`/suggestion-slots/set/${testWorshipSet.id}`)
        .set(musicianToken())
        .expect(200);
    });
  });

  describe('GET /suggestion-slots/:id', () => {
    let suggestionSlot: any;

    beforeEach(async () => {
      suggestionSlot = await prisma.suggestionSlot.create({
        data: {
          setId: testWorshipSet.id,
          assignedUserId: testUser1.id,
          minSongs: 1,
          maxSongs: 3,
          dueAt: new Date('2025-02-28'),
        },
      });
    });

    afterEach(async () => {
      await prisma.suggestionSlot.deleteMany({
        where: { id: suggestionSlot.id },
      });
    });

    it('should return suggestion slot by id', async () => {
      const response = await request(app)
        .get(`/suggestion-slots/${suggestionSlot.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data.id).toBe(suggestionSlot.id);
      expect(response.body.data.assignedUser).toBeDefined();
      expect(response.body.data.suggestions).toBeDefined();
    });

    it('should return 404 for non-existent slot', async () => {
      await request(app)
        .get('/suggestion-slots/00000000-0000-0000-0000-000000000000')
        .set(adminToken())
        .expect(404);
    });
  });
});
