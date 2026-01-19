import request from 'supertest';
import express from 'express';
import songVersionsRouter from '../../routes/songVersions';
import prisma from '../../prisma';
import { adminToken, leaderToken, musicianToken } from '../fixtures/authHelpers';

// Create Express app for testing
const app = express();
app.use(express.json({ limit: '10kb' }));
app.use('/song-versions', songVersionsRouter);

describe('Song Versions API', () => {
  let testSong: any;
  let testVersion: any;

  beforeAll(async () => {
    // Create a test song to associate versions with
    testSong = await prisma.song.create({
      data: {
        title: 'Test Song for Versions',
        artist: 'Test Artist',
        familiarityScore: 50,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testSong) {
      await prisma.songVersion.deleteMany({
        where: { songId: testSong.id },
      });
      await prisma.song.delete({
        where: { id: testSong.id },
      });
    }
  });

  beforeEach(async () => {
    // Clean up versions between tests
    await prisma.songVersion.deleteMany({
      where: { songId: testSong.id },
    });
  });

  describe('GET /song-versions', () => {
    beforeEach(async () => {
      testVersion = await prisma.songVersion.create({
        data: {
          songId: testSong.id,
          name: 'Original Version',
          defaultKey: 'G',
          bpm: 120,
        },
      });
    });

    it('should list all song versions', async () => {
      const response = await request(app)
        .get('/song-versions')
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by songId', async () => {
      const response = await request(app)
        .get(`/song-versions?songId=${testSong.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].songId).toBe(testSong.id);
    });

    it('should allow musicians to view versions', async () => {
      const response = await request(app)
        .get('/song-versions')
        .set(musicianToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /song-versions/:id', () => {
    beforeEach(async () => {
      testVersion = await prisma.songVersion.create({
        data: {
          songId: testSong.id,
          name: 'Get Test Version',
          defaultKey: 'C',
        },
      });
    });

    it('should get version by id', async () => {
      const response = await request(app)
        .get(`/song-versions/${testVersion.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testVersion.id);
      expect(response.body.data.name).toBe('Get Test Version');
    });

    it('should return 404 for non-existent version', async () => {
      await request(app)
        .get('/song-versions/00000000-0000-0000-0000-000000000000')
        .set(adminToken())
        .expect(404);
    });
  });

  describe('POST /song-versions', () => {
    it('should create version with admin token', async () => {
      const response = await request(app)
        .post('/song-versions')
        .set(adminToken())
        .send({
          songId: testSong.id,
          name: 'New Version',
          defaultKey: 'D',
          bpm: 100,
          youtubeUrl: 'https://youtube.com/watch?v=test',
          notes: 'Test notes',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('New Version');
      expect(response.body.data.defaultKey).toBe('D');
      expect(response.body.data.bpm).toBe(100);
    });

    it('should create version with leader token', async () => {
      const response = await request(app)
        .post('/song-versions')
        .set(leaderToken())
        .send({
          songId: testSong.id,
          name: 'Leader Version',
          defaultKey: 'E',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Leader Version');
    });

    it('should reject creation with musician role', async () => {
      await request(app)
        .post('/song-versions')
        .set(musicianToken())
        .send({
          songId: testSong.id,
          name: 'Should Fail',
        })
        .expect(403);
    });

    it('should require songId', async () => {
      await request(app)
        .post('/song-versions')
        .set(adminToken())
        .send({
          name: 'No Song ID',
        })
        .expect(500); // Will fail due to missing foreign key
    });
  });

  describe('PUT /song-versions/:id', () => {
    beforeEach(async () => {
      testVersion = await prisma.songVersion.create({
        data: {
          songId: testSong.id,
          name: 'Update Test Version',
          defaultKey: 'F',
          bpm: 90,
        },
      });
    });

    it('should update version with admin token', async () => {
      const response = await request(app)
        .put(`/song-versions/${testVersion.id}`)
        .set(adminToken())
        .send({
          name: 'Updated Version Name',
          defaultKey: 'A',
          bpm: 110,
        })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Version Name');
      expect(response.body.data.defaultKey).toBe('A');
      expect(response.body.data.bpm).toBe(110);
    });

    it('should update version with leader token', async () => {
      const response = await request(app)
        .put(`/song-versions/${testVersion.id}`)
        .set(leaderToken())
        .send({
          notes: 'Updated notes',
        })
        .expect(200);

      expect(response.body.data.notes).toBe('Updated notes');
    });

    it('should reject update with musician role', async () => {
      await request(app)
        .put(`/song-versions/${testVersion.id}`)
        .set(musicianToken())
        .send({
          name: 'Should Fail',
        })
        .expect(403);
    });
  });

  describe('DELETE /song-versions/:id', () => {
    beforeEach(async () => {
      testVersion = await prisma.songVersion.create({
        data: {
          songId: testSong.id,
          name: 'Delete Test Version',
        },
      });
    });

    it('should delete version with admin token', async () => {
      await request(app)
        .delete(`/song-versions/${testVersion.id}`)
        .set(adminToken())
        .expect(204);

      // Verify deletion
      const deleted = await prisma.songVersion.findUnique({
        where: { id: testVersion.id },
      });
      expect(deleted).toBeNull();
    });

    it('should delete version with leader token', async () => {
      await request(app)
        .delete(`/song-versions/${testVersion.id}`)
        .set(leaderToken())
        .expect(204);
    });

    it('should reject deletion with musician role', async () => {
      await request(app)
        .delete(`/song-versions/${testVersion.id}`)
        .set(musicianToken())
        .expect(403);
    });
  });
});
