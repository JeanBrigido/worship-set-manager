import request from 'supertest';
import express from 'express';
import serviceTypesRouter from '../../routes/serviceTypes';
import prisma from '../../prisma';
import { adminToken, leaderToken, musicianToken } from '../fixtures/authHelpers';

// Create Express app for testing
const app = express();
app.use(express.json({ limit: '10kb' }));
app.use('/service-types', serviceTypesRouter);

describe('Service Types API', () => {
  let testServiceType: any;

  beforeEach(async () => {
    // Clean up test service types
    await prisma.serviceType.deleteMany({
      where: { name: { startsWith: 'Test Service Type' } },
    });
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.serviceType.deleteMany({
      where: { name: { startsWith: 'Test Service Type' } },
    });
  });

  describe('GET /service-types', () => {
    beforeEach(async () => {
      testServiceType = await prisma.serviceType.create({
        data: {
          name: 'Test Service Type List',
          defaultStartTime: '09:00',
        },
      });
    });

    it('should list all service types with admin token', async () => {
      const response = await request(app)
        .get('/service-types')
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should list service types with leader token', async () => {
      const response = await request(app)
        .get('/service-types')
        .set(leaderToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should list service types with musician token', async () => {
      const response = await request(app)
        .get('/service-types')
        .set(musicianToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/service-types')
        .expect(401);
    });
  });

  describe('GET /service-types/:id', () => {
    beforeEach(async () => {
      testServiceType = await prisma.serviceType.create({
        data: {
          name: 'Test Service Type Get',
          defaultStartTime: '10:00',
          rrule: 'FREQ=WEEKLY;BYDAY=SU',
        },
      });
    });

    it('should get service type by id', async () => {
      const response = await request(app)
        .get(`/service-types/${testServiceType.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testServiceType.id);
      expect(response.body.data.name).toBe('Test Service Type Get');
      expect(response.body.data.rrule).toBe('FREQ=WEEKLY;BYDAY=SU');
    });

    it('should return 404 for non-existent service type', async () => {
      await request(app)
        .get('/service-types/00000000-0000-0000-0000-000000000000')
        .set(adminToken())
        .expect(404);
    });
  });

  describe('POST /service-types', () => {
    it('should create service type with admin token', async () => {
      const response = await request(app)
        .post('/service-types')
        .set(adminToken())
        .send({
          name: 'Test Service Type Create',
          defaultStartTime: '11:00',
          rrule: 'FREQ=WEEKLY;BYDAY=SA',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Test Service Type Create');
      expect(response.body.data.defaultStartTime).toBe('11:00');
      expect(response.body.data.rrule).toBe('FREQ=WEEKLY;BYDAY=SA');
    });

    it('should reject creation with leader role', async () => {
      await request(app)
        .post('/service-types')
        .set(leaderToken())
        .send({
          name: 'Test Service Type Should Fail',
          defaultStartTime: '12:00',
        })
        .expect(403);
    });

    it('should reject creation with musician role', async () => {
      await request(app)
        .post('/service-types')
        .set(musicianToken())
        .send({
          name: 'Test Service Type Should Fail',
          defaultStartTime: '12:00',
        })
        .expect(403);
    });
  });

  describe('PUT /service-types/:id', () => {
    beforeEach(async () => {
      testServiceType = await prisma.serviceType.create({
        data: {
          name: 'Test Service Type Update',
          defaultStartTime: '09:00',
        },
      });
    });

    it('should update service type with admin token', async () => {
      const response = await request(app)
        .put(`/service-types/${testServiceType.id}`)
        .set(adminToken())
        .send({
          name: 'Test Service Type Updated',
          defaultStartTime: '10:30',
          rrule: 'FREQ=WEEKLY;BYDAY=MO',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Test Service Type Updated');
      expect(response.body.data.defaultStartTime).toBe('10:30');
      expect(response.body.data.rrule).toBe('FREQ=WEEKLY;BYDAY=MO');
    });

    it('should reject update with leader role', async () => {
      await request(app)
        .put(`/service-types/${testServiceType.id}`)
        .set(leaderToken())
        .send({
          name: 'Should Fail',
        })
        .expect(403);
    });

    it('should reject update with musician role', async () => {
      await request(app)
        .put(`/service-types/${testServiceType.id}`)
        .set(musicianToken())
        .send({
          name: 'Should Fail',
        })
        .expect(403);
    });
  });

  describe('DELETE /service-types/:id', () => {
    beforeEach(async () => {
      testServiceType = await prisma.serviceType.create({
        data: {
          name: 'Test Service Type Delete',
          defaultStartTime: '09:00',
        },
      });
    });

    it('should delete service type with admin token', async () => {
      await request(app)
        .delete(`/service-types/${testServiceType.id}`)
        .set(adminToken())
        .expect(204);

      const deleted = await prisma.serviceType.findUnique({
        where: { id: testServiceType.id },
      });
      expect(deleted).toBeNull();
    });

    it('should reject deletion with leader role', async () => {
      await request(app)
        .delete(`/service-types/${testServiceType.id}`)
        .set(leaderToken())
        .expect(403);
    });

    it('should reject deletion with musician role', async () => {
      await request(app)
        .delete(`/service-types/${testServiceType.id}`)
        .set(musicianToken())
        .expect(403);
    });
  });
});
