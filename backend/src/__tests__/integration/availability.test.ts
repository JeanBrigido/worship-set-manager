import request from 'supertest';
import express from 'express';
import { randomUUID } from 'crypto';
import availabilityRouter from '../../routes/availability';
import prisma from '../../prisma';
import { adminToken, leaderToken, musicianToken, tokenForUser } from '../fixtures/authHelpers';

// Create Express app for testing
const app = express();
app.use(express.json({ limit: '10kb' }));
app.use('/availability', availabilityRouter);

describe('Availability API', () => {
  let testUser: any;
  let testAvailability: any;
  const testUniqueId = randomUUID().slice(0, 8);

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `test-availability.${testUniqueId}@example.com`,
        name: `Test Availability User ${testUniqueId}`,
        roles: ['musician'],
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser?.id) {
      await prisma.availability.deleteMany({
        where: { userId: testUser.id },
      }).catch(() => {});
      await prisma.user.delete({
        where: { id: testUser.id },
      }).catch(() => {});
    }
  });

  beforeEach(async () => {
    // Clean up availability records between tests
    if (testUser?.id) {
      await prisma.availability.deleteMany({
        where: { userId: testUser.id },
      });
    }
  });

  describe('GET /availability/user/:userId', () => {
    beforeEach(async () => {
      testAvailability = await prisma.availability.create({
        data: {
          userId: testUser.id,
          start: new Date('2025-06-01T00:00:00Z'),
          end: new Date('2025-06-07T23:59:59Z'),
          notes: 'Vacation',
        },
      });
    });

    it('should list availability for self', async () => {
      const response = await request(app)
        .get(`/availability/user/${testUser.id}`)
        .set(tokenForUser(testUser.id, ['musician']))
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should allow admin to view any user availability', async () => {
      const response = await request(app)
        .get(`/availability/user/${testUser.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should allow leader to view any user availability', async () => {
      const response = await request(app)
        .get(`/availability/user/${testUser.id}`)
        .set(leaderToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should forbid musician from viewing other user availability', async () => {
      await request(app)
        .get(`/availability/user/${testUser.id}`)
        .set(musicianToken())
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/availability/user/${testUser.id}`)
        .expect(401);
    });
  });

  describe('GET /availability/:id', () => {
    beforeEach(async () => {
      testAvailability = await prisma.availability.create({
        data: {
          userId: testUser.id,
          start: new Date('2025-06-01T00:00:00Z'),
          end: new Date('2025-06-07T23:59:59Z'),
        },
      });
    });

    it('should get availability record by id for owner', async () => {
      const response = await request(app)
        .get(`/availability/${testAvailability.id}`)
        .set(tokenForUser(testUser.id, ['musician']))
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testAvailability.id);
    });

    it('should allow admin to view any availability record', async () => {
      const response = await request(app)
        .get(`/availability/${testAvailability.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should allow leader to view any availability record', async () => {
      const response = await request(app)
        .get(`/availability/${testAvailability.id}`)
        .set(leaderToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should forbid musician from viewing other user availability record', async () => {
      await request(app)
        .get(`/availability/${testAvailability.id}`)
        .set(musicianToken())
        .expect(403);
    });

    it('should return 404 for non-existent availability', async () => {
      await request(app)
        .get('/availability/00000000-0000-0000-0000-000000000000')
        .set(adminToken())
        .expect(404);
    });
  });

  describe('POST /availability', () => {
    it('should create availability for self', async () => {
      const response = await request(app)
        .post('/availability')
        .set(tokenForUser(testUser.id, ['musician']))
        .send({
          start: '2025-07-01T00:00:00Z',
          end: '2025-07-14T23:59:59Z',
          notes: 'Summer vacation',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(testUser.id);
      expect(response.body.data.notes).toBe('Summer vacation');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/availability')
        .send({
          start: '2025-07-01T00:00:00Z',
          end: '2025-07-14T23:59:59Z',
        })
        .expect(401);
    });
  });

  describe('PUT /availability/:id', () => {
    beforeEach(async () => {
      testAvailability = await prisma.availability.create({
        data: {
          userId: testUser.id,
          start: new Date('2025-06-01T00:00:00Z'),
          end: new Date('2025-06-07T23:59:59Z'),
          notes: 'Original notes',
        },
      });
    });

    it('should update availability for owner', async () => {
      const response = await request(app)
        .put(`/availability/${testAvailability.id}`)
        .set(tokenForUser(testUser.id, ['musician']))
        .send({
          notes: 'Updated notes',
        })
        .expect(200);

      expect(response.body.data.notes).toBe('Updated notes');
    });

    it('should forbid admin from updating other user availability', async () => {
      await request(app)
        .put(`/availability/${testAvailability.id}`)
        .set(adminToken())
        .send({
          notes: 'Should fail',
        })
        .expect(403);
    });

    it('should forbid leader from updating other user availability', async () => {
      await request(app)
        .put(`/availability/${testAvailability.id}`)
        .set(leaderToken())
        .send({
          notes: 'Should fail',
        })
        .expect(403);
    });

    it('should return 404 for non-existent availability', async () => {
      await request(app)
        .put('/availability/00000000-0000-0000-0000-000000000000')
        .set(tokenForUser(testUser.id, ['musician']))
        .send({
          notes: 'Test',
        })
        .expect(404);
    });
  });

  describe('DELETE /availability/:id', () => {
    beforeEach(async () => {
      testAvailability = await prisma.availability.create({
        data: {
          userId: testUser.id,
          start: new Date('2025-06-01T00:00:00Z'),
          end: new Date('2025-06-07T23:59:59Z'),
        },
      });
    });

    it('should delete availability for owner', async () => {
      await request(app)
        .delete(`/availability/${testAvailability.id}`)
        .set(tokenForUser(testUser.id, ['musician']))
        .expect(204);

      const deleted = await prisma.availability.findUnique({
        where: { id: testAvailability.id },
      });
      expect(deleted).toBeNull();
    });

    it('should forbid admin from deleting other user availability', async () => {
      await request(app)
        .delete(`/availability/${testAvailability.id}`)
        .set(adminToken())
        .expect(403);
    });

    it('should forbid leader from deleting other user availability', async () => {
      await request(app)
        .delete(`/availability/${testAvailability.id}`)
        .set(leaderToken())
        .expect(403);
    });

    it('should return 404 for non-existent availability', async () => {
      await request(app)
        .delete('/availability/00000000-0000-0000-0000-000000000000')
        .set(tokenForUser(testUser.id, ['musician']))
        .expect(404);
    });
  });
});
