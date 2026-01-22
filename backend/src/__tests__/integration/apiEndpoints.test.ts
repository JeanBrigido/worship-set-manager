import request from 'supertest';
import express from 'express';
import { Role } from '@prisma/client';
import songsRouter from '../../routes/songs';
import servicesRouter from '../../routes/services';
import assignmentsRouter from '../../routes/assignments';
import prisma from '../../prisma';
import { adminToken, leaderToken, musicianToken } from '../fixtures/authHelpers';

// Create Express app for testing
const app = express();
app.use(express.json({ limit: '10kb' }));
app.use('/songs', songsRouter);
app.use('/services', servicesRouter);
app.use('/assignments', assignmentsRouter);

describe('API Endpoints Integration Tests', () => {
  describe('GET /songs', () => {
    it('should list all songs', async () => {
      const response = await request(app)
        .get('/songs')
        .set(adminToken())
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow musicians to view songs', async () => {
      const response = await request(app)
        .get('/songs')
        .set(musicianToken())
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication to view songs', async () => {
      await request(app)
        .get('/songs')
        .expect(401);
    });
  });

  describe('GET /services', () => {
    it('should list all services', async () => {
      const response = await request(app)
        .get('/services')
        .set(adminToken())
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow musicians to view services', async () => {
      const response = await request(app)
        .get('/services')
        .set(musicianToken())
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication to view services', async () => {
      await request(app)
        .get('/services')
        .expect(401);
    });
  });

  describe('GET /services/:id', () => {
    let testService: any;

    beforeAll(async () => {
      // Create a test service
      const serviceType = await prisma.serviceType.findFirst();
      if (serviceType) {
        testService = await prisma.service.create({
          data: {
            serviceDate: new Date(),
            serviceTypeId: serviceType.id,
          },
        });
      }
    });

    afterAll(async () => {
      if (testService) {
        await prisma.service.delete({ where: { id: testService.id } });
      }
    });

    it('should retrieve a specific service by ID', async () => {
      if (!testService) {
        return;
      }

      const response = await request(app)
        .get(`/services/${testService.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toBe(testService.id);
    });

    it('should return 404 for non-existent service', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000999';
      await request(app)
        .get(`/services/${fakeId}`)
        .set(adminToken())
        .expect(404);
    });
  });

  describe('POST /services', () => {
    let serviceType: any;

    beforeAll(async () => {
      serviceType = await prisma.serviceType.findFirst();
    });

    afterEach(async () => {
      // Clean up created services - need to delete WorshipSets first due to foreign key
      const servicesToDelete = await prisma.service.findMany({
        where: {
          serviceDate: {
            gte: new Date('2025-01-01'),
          },
        },
        select: { id: true },
      });

      const serviceIds = servicesToDelete.map(s => s.id);

      // Delete in order respecting foreign key constraints
      // 1. Delete suggestions first
      await prisma.suggestion.deleteMany({
        where: {
          suggestionSlot: {
            worshipSet: {
              serviceId: { in: serviceIds },
            },
          },
        },
      });

      // 2. Delete suggestion slots
      await prisma.suggestionSlot.deleteMany({
        where: {
          worshipSet: {
            serviceId: { in: serviceIds },
          },
        },
      });

      // 3. Delete set songs
      await prisma.setSong.deleteMany({
        where: {
          worshipSet: {
            serviceId: { in: serviceIds },
          },
        },
      });

      // 4. Delete assignments
      await prisma.assignment.deleteMany({
        where: {
          worshipSet: {
            serviceId: { in: serviceIds },
          },
        },
      });

      // 5. Delete worship sets
      await prisma.worshipSet.deleteMany({
        where: {
          serviceId: { in: serviceIds },
        },
      });

      // 6. Finally delete services
      await prisma.service.deleteMany({
        where: {
          id: { in: serviceIds },
        },
      });
    });

    it('should create a service with valid data (admin)', async () => {
      if (!serviceType) {
        return;
      }

      const response = await request(app)
        .post('/services')
        .set(adminToken())
        .send({
          date: new Date('2025-10-15').toISOString(),
          serviceTypeId: serviceType.id,
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.serviceTypeId).toBe(serviceType.id);
    });

    it('should create a service with valid data (leader)', async () => {
      if (!serviceType) {
        return;
      }

      const response = await request(app)
        .post('/services')
        .set(leaderToken())
        .send({
          date: new Date('2025-10-16').toISOString(),
          serviceTypeId: serviceType.id,
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
    });

    it('should reject service creation by musician', async () => {
      if (!serviceType) {
        return;
      }

      await request(app)
        .post('/services')
        .set(musicianToken())
        .send({
          date: new Date('2025-10-17').toISOString(),
          serviceTypeId: serviceType.id,
        })
        .expect(403);
    });

    it('should reject service creation with invalid UUID', async () => {
      const response = await request(app)
        .post('/services')
        .set(adminToken())
        .send({
          serviceDate: new Date().toISOString(),
          serviceTypeId: 'not-a-valid-uuid',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /assignments', () => {
    it('should list all assignments', async () => {
      const response = await request(app)
        .get('/assignments')
        .set(adminToken())
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow musicians to view assignments', async () => {
      const response = await request(app)
        .get('/assignments')
        .set(musicianToken())
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication to view assignments', async () => {
      await request(app)
        .get('/assignments')
        .expect(401);
    });
  });

  describe('Request Body Size Limits', () => {
    it('should reject requests exceeding 10KB body size', async () => {
      // Create a payload larger than 10KB
      const largePayload = {
        name: 'A'.repeat(11 * 1024), // 11KB
        email: 'test@test.com',
        password: 'Password123',
      };

      const response = await request(app)
        .post('/services')
        .set(adminToken())
        .send(largePayload)
        .expect(413);
    });
  });

  describe('UUID Validation', () => {
    it('should reject invalid UUID format in service ID', async () => {
      await request(app)
        .get('/services/invalid-uuid')
        .set(adminToken())
        .expect(400);
    });

    it('should accept valid UUID format', async () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';

      // This will return 404 (not found) but that's OK - we're testing UUID validation
      const response = await request(app)
        .get(`/services/${validUUID}`)
        .set(adminToken());

      // Should not be 400 (bad request due to invalid UUID)
      expect(response.status).not.toBe(400);
    });
  });
});
