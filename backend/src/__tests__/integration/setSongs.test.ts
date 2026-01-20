import request from 'supertest';
import express from 'express';
import setSongsRouter from '../../routes/setSongs';
import prisma from '../../prisma';
import { adminToken, leaderToken, musicianToken } from '../fixtures/authHelpers';

// Create Express app for testing
const app = express();
app.use(express.json({ limit: '10kb' }));
app.use('/set-songs', setSongsRouter);

describe('Set Songs API', () => {
  let testSong: any;
  let testVersion: any;
  let testWorshipSet: any;
  let testService: any;
  let testServiceType: any;
  let testSetSong: any;

  beforeAll(async () => {
    // Create test service type
    testServiceType = await prisma.serviceType.create({
      data: {
        name: 'Test Service Type for SetSongs',
        defaultStartTime: '09:00',
      },
    });

    // Create test service
    testService = await prisma.service.create({
      data: {
        serviceTypeId: testServiceType.id,
        serviceDate: new Date('2025-06-01'),
      },
    });

    // Create test worship set
    testWorshipSet = await prisma.worshipSet.create({
      data: {
        serviceId: testService.id,
      },
    });

    // Create a test song
    testSong = await prisma.song.create({
      data: {
        title: 'Test Song for SetSongs',
        artist: 'Test Artist',
        familiarityScore: 50,
      },
    });

    // Create a test song version
    testVersion = await prisma.songVersion.create({
      data: {
        songId: testSong.id,
        name: 'Original',
        defaultKey: 'G',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data in reverse order of dependencies
    if (testWorshipSet) {
      await prisma.setSong.deleteMany({
        where: { setId: testWorshipSet.id },
      });
      await prisma.worshipSet.delete({
        where: { id: testWorshipSet.id },
      });
    }
    if (testService) {
      await prisma.service.delete({
        where: { id: testService.id },
      });
    }
    if (testServiceType) {
      await prisma.serviceType.delete({
        where: { id: testServiceType.id },
      });
    }
    if (testVersion) {
      await prisma.songVersion.delete({
        where: { id: testVersion.id },
      });
    }
    if (testSong) {
      await prisma.song.delete({
        where: { id: testSong.id },
      });
    }
  });

  beforeEach(async () => {
    // Clean up set songs between tests
    await prisma.setSong.deleteMany({
      where: { setId: testWorshipSet.id },
    });
  });

  describe('GET /set-songs/set/:setId', () => {
    beforeEach(async () => {
      testSetSong = await prisma.setSong.create({
        data: {
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 1,
        },
      });
    });

    it('should list songs for a worship set', async () => {
      const response = await request(app)
        .get(`/set-songs/set/${testWorshipSet.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should allow musicians to view set songs', async () => {
      const response = await request(app)
        .get(`/set-songs/set/${testWorshipSet.id}`)
        .set(musicianToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should return songs ordered by position', async () => {
      // Add a second song
      await prisma.setSong.create({
        data: {
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 2,
        },
      });

      const response = await request(app)
        .get(`/set-songs/set/${testWorshipSet.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].position).toBe(1);
      expect(response.body.data[1].position).toBe(2);
    });
  });

  describe('GET /set-songs/:id', () => {
    beforeEach(async () => {
      testSetSong = await prisma.setSong.create({
        data: {
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 1,
        },
      });
    });

    it('should get set song by id', async () => {
      const response = await request(app)
        .get(`/set-songs/${testSetSong.id}`)
        .set(adminToken())
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testSetSong.id);
    });

    it('should return 404 for non-existent set song', async () => {
      await request(app)
        .get('/set-songs/00000000-0000-0000-0000-000000000000')
        .set(adminToken())
        .expect(404);
    });
  });

  describe('POST /set-songs', () => {
    it('should create set song with admin token', async () => {
      const response = await request(app)
        .post('/set-songs')
        .set(adminToken())
        .send({
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 1,
          keyOverride: 'A',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.keyOverride).toBe('A');
    });

    it('should create set song with leader token', async () => {
      const response = await request(app)
        .post('/set-songs')
        .set(leaderToken())
        .send({
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 1,
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
    });

    it('should reject creation with musician role', async () => {
      await request(app)
        .post('/set-songs')
        .set(musicianToken())
        .send({
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 1,
        })
        .expect(403);
    });
  });

  describe('PUT /set-songs/:id', () => {
    beforeEach(async () => {
      testSetSong = await prisma.setSong.create({
        data: {
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 1,
        },
      });
    });

    it('should update set song with admin token', async () => {
      const response = await request(app)
        .put(`/set-songs/${testSetSong.id}`)
        .set(adminToken())
        .send({
          keyOverride: 'B',
          notes: 'Updated notes',
        })
        .expect(200);

      expect(response.body.data.keyOverride).toBe('B');
      expect(response.body.data.notes).toBe('Updated notes');
    });

    it('should update set song with leader token', async () => {
      const response = await request(app)
        .put(`/set-songs/${testSetSong.id}`)
        .set(leaderToken())
        .send({
          isNew: true,
        })
        .expect(200);

      expect(response.body.data.isNew).toBe(true);
    });

    it('should reject update with musician role', async () => {
      await request(app)
        .put(`/set-songs/${testSetSong.id}`)
        .set(musicianToken())
        .send({
          keyOverride: 'C',
        })
        .expect(403);
    });
  });

  describe('DELETE /set-songs/:id', () => {
    beforeEach(async () => {
      testSetSong = await prisma.setSong.create({
        data: {
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 1,
        },
      });
    });

    it('should delete set song with admin token', async () => {
      await request(app)
        .delete(`/set-songs/${testSetSong.id}`)
        .set(adminToken())
        .expect(204);

      const deleted = await prisma.setSong.findUnique({
        where: { id: testSetSong.id },
      });
      expect(deleted).toBeNull();
    });

    it('should delete set song with leader token', async () => {
      await request(app)
        .delete(`/set-songs/${testSetSong.id}`)
        .set(leaderToken())
        .expect(204);
    });

    it('should reject deletion with musician role', async () => {
      await request(app)
        .delete(`/set-songs/${testSetSong.id}`)
        .set(musicianToken())
        .expect(403);
    });

    it('should reorder remaining songs after deletion', async () => {
      // First delete the testSetSong created in beforeEach to start fresh
      await prisma.setSong.delete({ where: { id: testSetSong.id } });

      // Create three songs
      const song1 = await prisma.setSong.create({
        data: {
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 1,
        },
      });
      const song2 = await prisma.setSong.create({
        data: {
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 2,
        },
      });
      const song3 = await prisma.setSong.create({
        data: {
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 3,
        },
      });

      // Delete the middle song
      await request(app)
        .delete(`/set-songs/${song2.id}`)
        .set(adminToken())
        .expect(204);

      // Check that song3's position was decremented
      const remainingSongs = await prisma.setSong.findMany({
        where: { setId: testWorshipSet.id },
        orderBy: { position: 'asc' },
      });

      expect(remainingSongs.length).toBe(2);
      expect(remainingSongs[0].position).toBe(1);
      expect(remainingSongs[1].position).toBe(2);
    });
  });

  describe('PUT /set-songs/set/:setId/reorder', () => {
    let song1: any, song2: any, song3: any;

    beforeEach(async () => {
      song1 = await prisma.setSong.create({
        data: {
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 1,
        },
      });
      song2 = await prisma.setSong.create({
        data: {
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 2,
        },
      });
      song3 = await prisma.setSong.create({
        data: {
          setId: testWorshipSet.id,
          songVersionId: testVersion.id,
          position: 3,
        },
      });
    });

    it('should reorder songs with admin token', async () => {
      const response = await request(app)
        .put(`/set-songs/set/${testWorshipSet.id}/reorder`)
        .set(adminToken())
        .send({
          songIds: [song3.id, song1.id, song2.id],
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data[0].id).toBe(song3.id);
      expect(response.body.data[0].position).toBe(1);
      expect(response.body.data[1].id).toBe(song1.id);
      expect(response.body.data[1].position).toBe(2);
      expect(response.body.data[2].id).toBe(song2.id);
      expect(response.body.data[2].position).toBe(3);
    });

    it('should reorder songs with leader token', async () => {
      const response = await request(app)
        .put(`/set-songs/set/${testWorshipSet.id}/reorder`)
        .set(leaderToken())
        .send({
          songIds: [song2.id, song3.id, song1.id],
        })
        .expect(200);

      expect(response.body.data[0].id).toBe(song2.id);
    });

    it('should reject reorder with musician role', async () => {
      await request(app)
        .put(`/set-songs/set/${testWorshipSet.id}/reorder`)
        .set(musicianToken())
        .send({
          songIds: [song3.id, song1.id, song2.id],
        })
        .expect(403);
    });

    it('should reject empty songIds array', async () => {
      await request(app)
        .put(`/set-songs/set/${testWorshipSet.id}/reorder`)
        .set(adminToken())
        .send({
          songIds: [],
        })
        .expect(400);
    });

    it('should reject invalid song IDs', async () => {
      await request(app)
        .put(`/set-songs/set/${testWorshipSet.id}/reorder`)
        .set(adminToken())
        .send({
          songIds: ['00000000-0000-0000-0000-000000000000'],
        })
        .expect(400);
    });
  });
});
