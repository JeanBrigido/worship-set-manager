import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middleware/errorHandler";
import logger from "./utils/logger";

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [
  "http://localhost:3003",
  "http://localhost:3000"
];
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: function (origin, callback) {
    // In production, require an origin header for security
    // In development, allow requests without origin (e.g., Postman, curl)
    if (!origin) {
      if (isProduction) {
        return callback(new Error('Origin header required'), false);
      }
      return callback(null, true);
    }

    // Check if origin is in allowed list (no wildcard support for security)
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn({ origin }, 'CORS blocked request from origin');
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limiting - applies to all routes
// More restrictive limits are applied to specific auth endpoints in routes/users.ts
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // 100 requests per 15 min in production, 1000 in dev
  message: { error: { message: "Too many requests, please try again later" } },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health',
});
app.use(globalLimiter);

// Request body size limits
app.use(express.json({ limit: '10kb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      userId: (req as any).user?.userId,
    };

    // Skip health check logging in production to reduce noise
    if (req.path === '/health' && isProduction) {
      return;
    }

    if (res.statusCode >= 500) {
      logger.error(logData, 'Request completed with server error');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'Request completed with client error');
    } else {
      logger.info(logData, 'Request completed');
    }
  });

  next();
});

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
  { path: "/api", file: "./routes/chordSheets", name: "Chord Sheets" },
];

routes.forEach(({ path, file, name }) => {
  try {
    const route = require(file);
    app.use(path, route.default || route);
    logger.info({ route: name, path }, 'Route loaded successfully');
  } catch (error) {
    logger.error({ route: name, path, error }, 'Failed to load route');
  }
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});





