import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  "http://localhost:3003",
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Request body size limits
app.use(express.json({ limit: '10kb' }));

// Test route
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Add routes gradually to ensure stability
const routes = [
  { path: "/api/users", file: "./routes/users", name: "Users" },
  { path: "/api/services", file: "./routes/services", name: "Services" },
  { path: "/api/songs", file: "./routes/songs", name: "Songs" },
  { path: "/api/song-versions", file: "./routes/songVersions", name: "Song Versions" },
  { path: "/api/assignments", file: "./routes/assignments", name: "Assignments" },
  { path: "/api/service-types", file: "./routes/serviceTypes", name: "Service Types" },
  { path: "/api/worship-sets", file: "./routes/worshipSets", name: "Worship Sets" },
  { path: "/api/instruments", file: "./routes/instruments", name: "Instruments" },
  { path: "/api/set-songs", file: "./routes/setSongs", name: "Set Songs" },
  { path: "/api/leader-rotations", file: "./routes/leaderRotations", name: "Leader Rotations" },
  { path: "/api/suggestions", file: "./routes/suggestions", name: "Suggestions" },
  { path: "/api/suggestion-slots", file: "./routes/suggestionSlots", name: "Suggestion Slots" },
  { path: "/api/default-assignments", file: "./routes/defaultAssignments", name: "Default Assignments" },
  { path: "/api/singer-song-keys", file: "./routes/singerSongKeys", name: "Singer Song Keys" },
];

routes.forEach(({ path, file, name }) => {
  try {
    const route = require(file);
    app.use(path, route.default || route);
    console.log(`✓ ${name} route loaded successfully`);
  } catch (error) {
    console.error(`✗ Failed to load ${name} route:`, error);
  }
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});





