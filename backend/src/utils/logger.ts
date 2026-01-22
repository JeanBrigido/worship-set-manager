import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

// Create logger with appropriate configuration for the environment
const logger = pino({
  level: isTest ? "silent" : (process.env.LOG_LEVEL || (isProduction ? "info" : "debug")),
  // Use structured JSON in production, pretty print in development
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
  // Base properties included in every log
  base: isProduction
    ? {
        env: process.env.NODE_ENV,
        version: process.env.npm_package_version,
      }
    : undefined,
  // Redact sensitive fields
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "*.password",
      "token",
      "*.token",
      "refreshToken",
      "*.refreshToken",
    ],
    remove: true,
  },
});

export default logger;

// Child logger for specific contexts
export const createChildLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};

// Request context logger (creates a child with request metadata)
export const createRequestLogger = (req: {
  method: string;
  url: string;
  ip?: string;
  userId?: string;
}) => {
  return logger.child({
    reqId: Math.random().toString(36).substring(7),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.userId,
  });
};
