import request from 'supertest';
import express from 'express';
import defaultAssignmentsRouter from '../../routes/defaultAssignments';
import prisma from '../../prisma';
import { adminToken, leaderToken, musicianToken } from '../fixtures/authHelpers';

// Create Express app for testing
const app = express();
app.use(express.json({ limit: '10kb' }));
app.use('/default-assignments', defaultAssignmentsRouter);

describe('Default Assignments API', () => {
  let testServiceType: any;
  let testInstrument: any;
  let testUser: any;
  let testAssignment: any;

  beforeAll(async () => {
    // Create test service type
    testServiceType = await prisma.serviceType.create({
      data: {
        name: 'Test Service Type for DefaultAssignments',
        defaultStartTime: '10:00',
      },
    });

    // Create test instrument
    testInstrument = await prisma.instrument.create({
      data: {
        code: 'test-default-inst',
        displayName: 'Test Default Instrument',
        maxPerSet: 1,
      },
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test-default-assignment@example.com',
        name: 'Test Default Assignment User',
        roles: ['musician'],
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.defaultAssignment.deleteMany({
      where: {
        OR: [
          { serviceTypeId: testServiceType?.id },
          { instrumentId: testInstrument?.id },
        ],
      },
    });

    if (testServiceType) {
      await prisma.serviceType.delete({
        where: { id: testServiceType.id },
      });
    }
    if (testInstrument) {
      await prisma.instrument.delete({
        where: { id: testInstrument.id },
      });
    }
    if (testUser) {
      await prisma.user.delete({
        where: { id: testUser.id },
      });
    }
  });

  beforeEach(async () => {
    // Clean up default assignments between tests
    await prisma.defaultAssignment.deleteMany({
      where: { serviceTypeId: testServiceType.id },
    });
  });

  describe('GET /default-assignments', () => {
    beforeEach(async () => {
      testAssignment = await prisma.defaultAssignment.create({
        data: {
          serviceTypeId: testServiceType.id,
          instrumentId: testInstrument.id,
          userId: testUser.id,
        },
      });
    });

    it('should list all default assignments with admin token', async () => {
      const response = await request(app)
        .get('/default-assignments')
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should list default assignments with leader token', async () => {
      const response = await request(app)
        .get('/default-assignments')
        .set(leaderToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should list default assignments with musician token', async () => {
      const response = await request(app)
        .get('/default-assignments')
        .set(musicianToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter by serviceTypeId', async () => {
      const response = await request(app)
        .get(`/default-assignments?serviceTypeId=${testServiceType.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].serviceTypeId).toBe(testServiceType.id);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/default-assignments')
        .expect(401);
    });
  });

  describe('GET /default-assignments/:id', () => {
    beforeEach(async () => {
      testAssignment = await prisma.defaultAssignment.create({
        data: {
          serviceTypeId: testServiceType.id,
          instrumentId: testInstrument.id,
          userId: testUser.id,
        },
      });
    });

    it('should get default assignment by id', async () => {
      const response = await request(app)
        .get(`/default-assignments/${testAssignment.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testAssignment.id);
      expect(response.body.data.serviceType).toBeDefined();
      expect(response.body.data.instrument).toBeDefined();
      expect(response.body.data.user).toBeDefined();
    });

    it('should return 404 for non-existent assignment', async () => {
      await request(app)
        .get('/default-assignments/00000000-0000-0000-0000-000000000000')
        .set(adminToken())
        .expect(404);
    });
  });

  describe('POST /default-assignments', () => {
    it('should create default assignment with admin token', async () => {
      const response = await request(app)
        .post('/default-assignments')
        .set(adminToken())
        .send({
          serviceTypeId: testServiceType.id,
          instrumentId: testInstrument.id,
          userId: testUser.id,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.serviceTypeId).toBe(testServiceType.id);
      expect(response.body.data.instrumentId).toBe(testInstrument.id);
      expect(response.body.data.userId).toBe(testUser.id);
    });

    it('should reject creation with leader role', async () => {
      await request(app)
        .post('/default-assignments')
        .set(leaderToken())
        .send({
          serviceTypeId: testServiceType.id,
          instrumentId: testInstrument.id,
          userId: testUser.id,
        })
        .expect(403);
    });

    it('should reject creation with musician role', async () => {
      await request(app)
        .post('/default-assignments')
        .set(musicianToken())
        .send({
          serviceTypeId: testServiceType.id,
          instrumentId: testInstrument.id,
          userId: testUser.id,
        })
        .expect(403);
    });

    it('should reject duplicate service type + instrument combination', async () => {
      // Create first assignment
      await request(app)
        .post('/default-assignments')
        .set(adminToken())
        .send({
          serviceTypeId: testServiceType.id,
          instrumentId: testInstrument.id,
          userId: testUser.id,
        })
        .expect(201);

      // Try to create duplicate
      await request(app)
        .post('/default-assignments')
        .set(adminToken())
        .send({
          serviceTypeId: testServiceType.id,
          instrumentId: testInstrument.id,
          userId: testUser.id,
        })
        .expect(400);
    });
  });

  describe('PUT /default-assignments/:id', () => {
    let secondUser: any;

    beforeAll(async () => {
      secondUser = await prisma.user.create({
        data: {
          email: 'test-default-assignment-2@example.com',
          name: 'Second Test User',
          roles: ['musician'],
        },
      });
    });

    afterAll(async () => {
      if (secondUser) {
        await prisma.user.delete({
          where: { id: secondUser.id },
        });
      }
    });

    beforeEach(async () => {
      testAssignment = await prisma.defaultAssignment.create({
        data: {
          serviceTypeId: testServiceType.id,
          instrumentId: testInstrument.id,
          userId: testUser.id,
        },
      });
    });

    it('should update default assignment with admin token', async () => {
      const response = await request(app)
        .put(`/default-assignments/${testAssignment.id}`)
        .set(adminToken())
        .send({
          userId: secondUser.id,
        })
        .expect(200);

      expect(response.body.data.userId).toBe(secondUser.id);
    });

    it('should reject update with leader role', async () => {
      await request(app)
        .put(`/default-assignments/${testAssignment.id}`)
        .set(leaderToken())
        .send({
          userId: secondUser.id,
        })
        .expect(403);
    });

    it('should reject update with musician role', async () => {
      await request(app)
        .put(`/default-assignments/${testAssignment.id}`)
        .set(musicianToken())
        .send({
          userId: secondUser.id,
        })
        .expect(403);
    });

    it('should return 404 for non-existent assignment', async () => {
      await request(app)
        .put('/default-assignments/00000000-0000-0000-0000-000000000000')
        .set(adminToken())
        .send({
          userId: secondUser.id,
        })
        .expect(404);
    });
  });

  describe('DELETE /default-assignments/:id', () => {
    beforeEach(async () => {
      testAssignment = await prisma.defaultAssignment.create({
        data: {
          serviceTypeId: testServiceType.id,
          instrumentId: testInstrument.id,
          userId: testUser.id,
        },
      });
    });

    it('should delete default assignment with admin token', async () => {
      await request(app)
        .delete(`/default-assignments/${testAssignment.id}`)
        .set(adminToken())
        .expect(204);

      const deleted = await prisma.defaultAssignment.findUnique({
        where: { id: testAssignment.id },
      });
      expect(deleted).toBeNull();
    });

    it('should reject deletion with leader role', async () => {
      await request(app)
        .delete(`/default-assignments/${testAssignment.id}`)
        .set(leaderToken())
        .expect(403);
    });

    it('should reject deletion with musician role', async () => {
      await request(app)
        .delete(`/default-assignments/${testAssignment.id}`)
        .set(musicianToken())
        .expect(403);
    });

    it('should return 404 for non-existent assignment', async () => {
      await request(app)
        .delete('/default-assignments/00000000-0000-0000-0000-000000000000')
        .set(adminToken())
        .expect(404);
    });
  });
});
