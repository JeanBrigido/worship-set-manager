import request from 'supertest';
import express from 'express';
import suggestionsRouter from '../src/routes/suggestions';
import { authMiddleware } from '../src/middleware/authMiddleware';
import prisma from '../src/prisma';

// Mock the middleware
jest.mock('../src/middleware/authMiddleware');
jest.mock('../src/prisma', () => ({
  __esModule: true,
  default: {
    suggestion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    suggestionSlot: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/suggestions', suggestionsRouter);

describe('Suggestions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authMiddleware as jest.Mock).mockImplementation((req, res, next) => {
      req.user = {
        userId: 'user-123',
        roles: ['leader'],
      };
      next();
    });
  });

  describe('GET /suggestions/by-worship-set/:worshipSetId', () => {
    it('should return all suggestions for a worship set', async () => {
      const mockSlots = [
        {
          id: 'slot-1',
          minSongs: 1,
          maxSongs: 3,
          dueAt: new Date('2025-10-10'),
          status: 'pending',
          assignedUser: {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
          suggestions: [
            {
              id: 'suggestion-1',
              songId: 'song-1',
              notes: 'Great song',
              song: {
                id: 'song-1',
                title: 'Amazing Grace',
                artist: 'Traditional',
                versions: [],
              },
            },
          ],
        },
      ];

      (prisma.suggestionSlot.findMany as jest.Mock).mockResolvedValue(mockSlots);

      const response = await request(app)
        .get('/suggestions/by-worship-set/worship-set-123')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: 'suggestion-1',
        suggester: {
          id: 'user-1',
          name: 'John Doe',
        },
        slotInfo: {
          id: 'slot-1',
          minSongs: 1,
          maxSongs: 3,
        },
      });
    });
  });

  describe('PUT /suggestions/:id/approve', () => {
    it('should approve a suggestion and add to worship set', async () => {
      const mockSuggestion = {
        id: 'suggestion-1',
        songId: 'song-1',
        suggestionSlot: {
          worshipSet: {
            id: 'worship-set-1',
            setSongs: [
              { id: 'set-song-1', position: 1 },
              { id: 'set-song-2', position: 2 },
            ],
          },
        },
        song: {
          id: 'song-1',
          title: 'Amazing Grace',
          versions: [{ id: 'version-1' }],
        },
      };

      (prisma.suggestion.findUnique as jest.Mock).mockResolvedValue(mockSuggestion);
      (prisma.suggestion.delete as jest.Mock).mockResolvedValue({ id: 'suggestion-1' });

      const response = await request(app)
        .put('/suggestions/suggestion-1/approve')
        .send({
          addToSet: true,
          songVersionId: 'version-1',
        })
        .expect(200);

      expect(response.body.data.message).toContain('approved and added');
    });

    it('should reject when worship set is at max capacity', async () => {
      const mockSuggestion = {
        id: 'suggestion-1',
        songId: 'song-1',
        suggestionSlot: {
          worshipSet: {
            id: 'worship-set-1',
            setSongs: Array(6).fill({ id: 'song' }), // 6 songs (max capacity)
          },
        },
        song: {
          id: 'song-1',
          title: 'Amazing Grace',
          versions: [{ id: 'version-1' }],
        },
      };

      (prisma.suggestion.findUnique as jest.Mock).mockResolvedValue(mockSuggestion);

      const response = await request(app)
        .put('/suggestions/suggestion-1/approve')
        .send({
          addToSet: true,
          songVersionId: 'version-1',
        })
        .expect(400);

      expect(response.body.error.message).toContain('maximum capacity');
    });

    it('should require admin or leader role', async () => {
      (authMiddleware as jest.Mock).mockImplementation((req, res, next) => {
        req.user = {
          userId: 'user-123',
          roles: ['musician'], // Not admin or leader
        };
        next();
      });

      const response = await request(app)
        .put('/suggestions/suggestion-1/approve')
        .send({
          addToSet: true,
          songVersionId: 'version-1',
        })
        .expect(403);

      expect(response.body.error.message).toContain('Admin or Leader');
    });
  });

  describe('PUT /suggestions/:id/reject', () => {
    it('should reject a suggestion', async () => {
      const mockSuggestion = {
        id: 'suggestion-1',
        songId: 'song-1',
      };

      (prisma.suggestion.findUnique as jest.Mock).mockResolvedValue(mockSuggestion);
      (prisma.suggestion.delete as jest.Mock).mockResolvedValue({ id: 'suggestion-1' });

      const response = await request(app)
        .put('/suggestions/suggestion-1/reject')
        .expect(200);

      expect(response.body.data.message).toBe('Suggestion rejected');
      expect(prisma.suggestion.delete).toHaveBeenCalledWith({
        where: { id: 'suggestion-1' },
      });
    });

    it('should return 404 if suggestion not found', async () => {
      (prisma.suggestion.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/suggestions/suggestion-1/reject')
        .expect(404);

      expect(response.body.error.message).toBe('Suggestion not found');
    });
  });

  describe('POST /suggestions', () => {
    it('should create a suggestion', async () => {
      const mockSlot = {
        id: 'slot-1',
        assignedUserId: 'user-123',
        worshipSet: {
          suggestDueAt: new Date('2025-12-31'),
        },
      };

      const mockSuggestion = {
        id: 'suggestion-1',
        slotId: 'slot-1',
        songId: 'song-1',
        notes: 'Great song',
      };

      (prisma.suggestionSlot.findUnique as jest.Mock).mockResolvedValue(mockSlot);
      (prisma.suggestion.findFirst as jest.Mock).mockResolvedValue(null); // No duplicate
      (prisma.suggestion.create as jest.Mock).mockResolvedValue(mockSuggestion);

      const response = await request(app)
        .post('/suggestions')
        .send({
          slotId: 'slot-1',
          songId: 'song-1',
          notes: 'Great song',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'suggestion-1',
        songId: 'song-1',
      });
    });

    it('should reject if deadline has passed', async () => {
      const mockSlot = {
        id: 'slot-1',
        assignedUserId: 'user-123',
        worshipSet: {
          suggestDueAt: new Date('2020-01-01'), // Past date
        },
      };

      (prisma.suggestionSlot.findUnique as jest.Mock).mockResolvedValue(mockSlot);

      const response = await request(app)
        .post('/suggestions')
        .send({
          slotId: 'slot-1',
          songId: 'song-1',
        })
        .expect(400);

      expect(response.body.error).toContain('deadline has passed');
    });
  });

  describe('GET /suggestions/slot/:slotId', () => {
    it('should return all suggestions for a slot', async () => {
      const mockSuggestions = [
        {
          id: 'suggestion-1',
          slotId: 'slot-1',
          song: {
            id: 'song-1',
            title: 'Amazing Grace',
          },
        },
      ];

      (prisma.suggestion.findMany as jest.Mock).mockResolvedValue(mockSuggestions);

      const response = await request(app)
        .get('/suggestions/slot/slot-1')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('suggestion-1');
    });
  });
});
