import request from 'supertest';
import express from 'express';
import instrumentsRouter from '../../routes/instruments';
import prisma from '../../prisma';
import { adminToken, leaderToken, musicianToken } from '../fixtures/authHelpers';

// Create Express app for testing
const app = express();
app.use(express.json({ limit: '10kb' }));
app.use('/instruments', instrumentsRouter);

describe('Instruments API', () => {
  let testInstrument: any;

  beforeEach(async () => {
    // Clean up test instruments
    await prisma.instrument.deleteMany({
      where: { code: { startsWith: 'test-' } },
    });
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.instrument.deleteMany({
      where: { code: { startsWith: 'test-' } },
    });
  });

  describe('GET /instruments', () => {
    it('should list all instruments with admin token', async () => {
      const response = await request(app)
        .get('/instruments')
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should list instruments with musician token', async () => {
      const response = await request(app)
        .get('/instruments')
        .set(musicianToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/instruments')
        .expect(401);
    });
  });

  describe('POST /instruments', () => {
    it('should create instrument with admin token', async () => {
      const response = await request(app)
        .post('/instruments')
        .set(adminToken())
        .send({
          code: 'test-guitar',
          displayName: 'Test Guitar',
          maxPerSet: 2,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.code).toBe('test-guitar');
      expect(response.body.data.displayName).toBe('Test Guitar');
      expect(response.body.data.maxPerSet).toBe(2);

      testInstrument = response.body.data;
    });

    it('should reject creation without admin role', async () => {
      await request(app)
        .post('/instruments')
        .set(leaderToken())
        .send({
          code: 'test-bass',
          displayName: 'Test Bass',
          maxPerSet: 1,
        })
        .expect(403);
    });

    it('should reject creation with musician role', async () => {
      await request(app)
        .post('/instruments')
        .set(musicianToken())
        .send({
          code: 'test-drums',
          displayName: 'Test Drums',
          maxPerSet: 1,
        })
        .expect(403);
    });

    it('should reject duplicate code', async () => {
      // First create
      await request(app)
        .post('/instruments')
        .set(adminToken())
        .send({
          code: 'test-unique',
          displayName: 'Test Unique',
          maxPerSet: 1,
        })
        .expect(201);

      // Try duplicate
      await request(app)
        .post('/instruments')
        .set(adminToken())
        .send({
          code: 'test-unique',
          displayName: 'Another Name',
          maxPerSet: 2,
        })
        .expect(400);
    });
  });

  describe('GET /instruments/:id', () => {
    beforeEach(async () => {
      testInstrument = await prisma.instrument.create({
        data: {
          code: 'test-get',
          displayName: 'Test Get',
          maxPerSet: 1,
        },
      });
    });

    it('should get instrument by id', async () => {
      const response = await request(app)
        .get(`/instruments/${testInstrument.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testInstrument.id);
      expect(response.body.data.code).toBe('test-get');
    });

    it('should return 404 for non-existent instrument', async () => {
      await request(app)
        .get('/instruments/00000000-0000-0000-0000-000000000000')
        .set(adminToken())
        .expect(404);
    });
  });

  describe('PUT /instruments/:id', () => {
    beforeEach(async () => {
      testInstrument = await prisma.instrument.create({
        data: {
          code: 'test-update',
          displayName: 'Test Update',
          maxPerSet: 1,
        },
      });
    });

    it('should update instrument with admin token', async () => {
      const response = await request(app)
        .put(`/instruments/${testInstrument.id}`)
        .set(adminToken())
        .send({
          displayName: 'Updated Name',
          maxPerSet: 3,
        })
        .expect(200);

      expect(response.body.data.displayName).toBe('Updated Name');
      expect(response.body.data.maxPerSet).toBe(3);
    });

    it('should reject update without admin role', async () => {
      await request(app)
        .put(`/instruments/${testInstrument.id}`)
        .set(leaderToken())
        .send({
          displayName: 'Should Fail',
        })
        .expect(403);
    });
  });

  describe('DELETE /instruments/:id', () => {
    beforeEach(async () => {
      testInstrument = await prisma.instrument.create({
        data: {
          code: 'test-delete',
          displayName: 'Test Delete',
          maxPerSet: 1,
        },
      });
    });

    it('should delete instrument with admin token', async () => {
      await request(app)
        .delete(`/instruments/${testInstrument.id}`)
        .set(adminToken())
        .expect(204);

      // Verify deletion
      const deleted = await prisma.instrument.findUnique({
        where: { id: testInstrument.id },
      });
      expect(deleted).toBeNull();
    });

    it('should reject deletion without admin role', async () => {
      await request(app)
        .delete(`/instruments/${testInstrument.id}`)
        .set(leaderToken())
        .expect(403);
    });
  });
});
