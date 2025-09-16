import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Worship Set Manager API is running' });
});

// Mock endpoints (will work without database)
app.get('/api/songs', async (req, res) => {
  try {
    // Mock data for testing without database
    const songs = [
      {
        id: '1',
        title: 'Amazing Grace',
        artist: 'Traditional',
        key: 'G',
        tempo: 80,
        duration: 240,
      },
      {
        id: '2',
        title: 'How Great Is Our God',
        artist: 'Chris Tomlin',
        key: 'C',
        tempo: 76,
        duration: 285,
      },
    ];
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

app.get('/api/worship-sets', async (req, res) => {
  try {
    // Mock data for testing without database
    const worshipSets = [
      {
        id: '1',
        name: 'Sunday Morning Worship',
        date: new Date().toISOString(),
        description: 'Main Sunday service worship set',
        songs: [
          { id: '1', title: 'Amazing Grace', order: 1 },
          { id: '2', title: 'How Great Is Our God', order: 2 },
        ],
      },
    ];
    res.json(worshipSets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch worship sets' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});
