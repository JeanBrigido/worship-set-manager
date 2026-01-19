# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install all dependencies (both frontend and backend)
npm install

# Development - run both frontend and backend concurrently
npm run dev

# Run frontend only (http://localhost:3000)
npm run dev:frontend

# Run backend only (http://localhost:3001)
npm run dev:backend

# Build all
npm run build

# Lint all workspaces
npm run lint
npm run lint:fix

# Format with Prettier
npm run format
```

### Backend Commands (run from root or backend/)
```bash
# Tests (Jest)
npm run test --workspace=backend
npm run test:watch --workspace=backend
npm run test:coverage --workspace=backend

# Single test file
npx jest --workspace=backend -- path/to/test.ts

# Database
npm run db:generate --workspace=backend  # Generate Prisma client
npm run db:push --workspace=backend       # Push schema to database
npm run db:migrate --workspace=backend    # Run migrations
npm run db:studio --workspace=backend     # Open Prisma Studio
npm run db:seed --workspace=backend       # Seed database
```

### Frontend Commands (run from root or frontend/)
```bash
# Tests (Vitest)
npm run test --workspace=frontend
npm run test:watch --workspace=frontend
npm run test:coverage --workspace=frontend

# E2E Tests (Playwright)
npm run test:e2e --workspace=frontend
npm run test:e2e:ui --workspace=frontend
```

## Architecture Overview

### Monorepo Structure
This is an npm workspaces monorepo with two packages:
- `frontend/` - Next.js 14 with App Router
- `backend/` - Express.js REST API

### Backend Architecture (Express + Prisma)
- **Entry point**: `backend/src/index.ts`
- **Routes**: `backend/src/routes/` - Express routers for each resource
- **Controllers**: `backend/src/controllers/` - Business logic for each route
- **Middleware**: `backend/src/middleware/`
  - `authMiddleware.ts` - JWT validation
  - `requireRole.ts` - Role-based access control (admin, leader, musician)
  - `worshipSetLeaderAuth.ts` - Worship set leader authorization
  - `validateRequest.ts` - Zod request validation
- **Validation**: `backend/src/validation/` - Zod schemas for each resource
- **Database**: `backend/prisma/schema.prisma` - PostgreSQL with Prisma ORM
- **Tests**: `backend/src/__tests__/` - Jest with `jest-mock-extended` for Prisma mocking

### Frontend Architecture (Next.js 14)
- **App Router**: `frontend/src/app/` - Page routes and API routes
- **Components**: `frontend/src/components/`
  - `ui/` - shadcn/ui components (Button, Card, Dialog, etc.)
  - `forms/` - Form components (service-form, song-form, assignment-form)
  - `layout/` - Layout components (header, main-layout, page-header)
  - `providers/` - Context providers (query-provider, session-provider)
  - `worship-set/` - Domain-specific components
- **API Routes**: `frontend/src/app/api/` - Next.js API routes that proxy to backend or use Prisma directly
- **Lib**: `frontend/src/lib/`
  - `auth.ts` - NextAuth configuration with credentials provider
  - `api-client.ts` - HTTP client for backend API calls
  - `jwt-bridge.ts` - JWT generation for backend authentication
  - `prisma.ts` - Prisma client singleton
- **Hooks**: `frontend/src/hooks/use-api.ts` - React Query hooks for API calls
- **Tests**: `frontend/src/__tests__/` - Vitest with React Testing Library

### Authentication Flow
1. Frontend uses NextAuth with credentials provider and JWT session strategy
2. Frontend API client generates JWT tokens via `jwt-bridge.ts`
3. Backend validates JWT in `authMiddleware.ts`
4. User roles (admin, leader, musician) control access via `requireRole.ts`

### Domain Model (Key Entities)
- **User**: Musicians with roles (admin, leader, musician)
- **ServiceType**: Recurring service templates (e.g., Sunday Morning)
- **Service**: Specific service date with optional leader
- **WorshipSet**: Song list for a service (draft → collecting → selecting → published → locked)
- **Song/SongVersion**: Songs with multiple arrangements
- **SetSong**: Song placement in a worship set with key/position
- **SuggestionSlot**: Allows users to suggest songs for a set
- **Assignment**: Musician instrument assignment for a worship set
- **Instrument**: Available instruments with max-per-set limits
- **LeaderRotation**: Automatic leader scheduling per service type

### Testing Patterns
- Backend: Mock Prisma with `jest-mock-extended`, use `supertest` for API tests
- Frontend: Mock NextAuth session, mock API responses with MSW or vitest mocks
- Test files in `__tests__/` directories, fixtures in `__tests__/fixtures/`

### API Response Format
Backend returns `{ data: T }` for success, `{ error: { message, code?, details? } }` for errors.
