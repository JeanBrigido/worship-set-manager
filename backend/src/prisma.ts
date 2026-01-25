// src/prisma.ts
import { PrismaClient } from '@prisma/client';

// Build DATABASE_URL with connection pool settings for Supabase PgBouncer
// This prevents stale connections by limiting pool size and adding timeouts
function getDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL || '';

  // If URL already has pgbouncer param, add connection_limit
  // If not, this ensures fresh connections
  if (baseUrl.includes('?')) {
    // Check if connection_limit is already set
    if (!baseUrl.includes('connection_limit')) {
      return `${baseUrl}&connection_limit=1`;
    }
    return baseUrl;
  }
  return `${baseUrl}?connection_limit=1`;
}

// Configure Prisma with connection pool settings optimized for Supabase PgBouncer
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
  // Log queries in development for debugging
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Ensure connections are properly closed on app shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
