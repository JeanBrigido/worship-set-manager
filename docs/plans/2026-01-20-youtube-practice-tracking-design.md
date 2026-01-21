# YouTube Song Practice Tracking Feature

## Overview
Allow users to easily access YouTube links for songs in their upcoming worship sets and track which songs they've listened to for practice.

## Design Decisions

### Tracking Scope
**Per-user, per-setSong tracking** - Each SetSong instance is tracked separately per user. If the same song appears in multiple services, each instance has its own listened status.

### Dashboard Placement
**New dedicated "Songs to Practice" section** - Appears prominently on the dashboard for users with upcoming service assignments.

### Service Page Display
**Expandable song rows** - Each song in the worship set can be expanded to show YouTube link and listened controls. Collapsed rows show a checkmark icon when listened.

### Persistence
**Database storage** - Listened status persists in database via `UserSetSongProgress` table.

### Auto-marking Behavior
**Auto-mark on click with toggle** - Clicking YouTube link auto-marks as listened, but users can manually toggle status.

---

## Phase 1: Database Schema Changes

### Files to modify:
- `/backend/prisma/schema.prisma`

### Changes:

**1. Add YouTube URL fields:**

```prisma
model Song {
  // ... existing fields
  defaultYoutubeUrl String?
}

model SongVersion {
  // ... existing fields
  youtubeUrl String?
}

model SetSong {
  // ... existing fields
  youtubeUrlOverride String?
}
```

**2. Add UserSetSongProgress model:**

```prisma
model UserSetSongProgress {
  id         String   @id @default(uuid())
  userId     String
  setSongId  String
  listenedAt DateTime @default(now())
  createdAt  DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  setSong SetSong @relation(fields: [setSongId], references: [id], onDelete: Cascade)

  @@unique([userId, setSongId])
  @@index([userId])
  @@index([setSongId])
}
```

**3. Add relations:**

```prisma
model User {
  // ... existing fields
  songProgress UserSetSongProgress[]
}

model SetSong {
  // ... existing fields
  userProgress UserSetSongProgress[]
}
```

**4. Run migration:**
```bash
npm run db:generate --workspace=backend
npm run db:migrate --workspace=backend
```

---

## Phase 2: Backend API

### New endpoints:

**1. POST /api/set-songs/:id/listened**
- Auth: Any authenticated user
- Creates UserSetSongProgress record for current user + setSong
- Returns: `{ data: { listenedAt: timestamp } }`

**2. DELETE /api/set-songs/:id/listened**
- Auth: Any authenticated user
- Deletes UserSetSongProgress record
- Returns: 204 No Content

**3. GET /api/users/:id/song-progress**
- Auth: Self or admin
- Query params: `upcoming=true` (filter to future services only)
- Returns: SetSongs grouped by service with listened status and YouTube URLs
- Response structure:
```json
{
  "data": [
    {
      "service": { "id": "...", "serviceDate": "...", "serviceType": {...} },
      "songs": [
        {
          "setSong": { "id": "...", "position": 1, "keyOverride": "G" },
          "songVersion": { "name": "...", "youtubeUrl": "..." },
          "song": { "title": "...", "artist": "...", "defaultYoutubeUrl": "..." },
          "youtubeUrl": "resolved URL (priority: override > version > song)",
          "listened": true,
          "listenedAt": "2026-01-20T..."
        }
      ]
    }
  ]
}
```

### Modified endpoints:

**4. GET /api/services/:id**
- Include `listenedByCurrentUser` boolean for each SetSong when user is authenticated
- Include resolved `youtubeUrl` for each SetSong

### Files to create/modify:

| File | Action |
|------|--------|
| `/backend/src/controllers/setSongsController.ts` | Add markListened, unmarkListened |
| `/backend/src/controllers/usersController.ts` | Add getSongProgress |
| `/backend/src/controllers/servicesController.ts` | Include listened status in getService |
| `/backend/src/routes/setSongs.ts` | Add POST/DELETE /:id/listened |
| `/backend/src/routes/users.ts` | Add GET /:id/song-progress |

---

## Phase 3: Frontend - Dashboard

### New component: `/frontend/src/components/dashboard/songs-to-practice.tsx`

**Layout:**
- Section header: "Songs to Practice" with music note icon
- Grouped by service date (card per service)
- Each service card shows:
  - Service date and type as header
  - List of songs with:
    - Song title and artist
    - Key badge
    - YouTube button (if URL exists)
    - Checkmark toggle button
- Progress indicator: "3 of 5 listened"

**Behavior:**
- Clicking YouTube button:
  1. Opens link in new tab
  2. Immediately marks as listened (optimistic update)
  3. Shows toast confirmation
- Clicking checkmark toggles listened status
- Empty state: "No upcoming services assigned" or "All caught up!"

**Data fetching:**
- Call `GET /api/users/me/song-progress?upcoming=true`
- Filter to services within next 14 days
- Hide services more than 24 hours in the past

---

## Phase 4: Frontend - Service Page

### Component: Expandable song rows in worship set section

**Collapsed state (default):**
- Song title, artist
- Singer badge (if assigned)
- Key badge
- **Checkmark icon** (green when listened, gray outline when not)
- Chevron icon to expand

**Expanded state:**
- All collapsed content plus:
- YouTube link button (if URL available): "Watch on YouTube" with external link icon
- Toggle button: "Mark as listened" / "Mark as not listened"
- Singer and key info (if not shown collapsed)

**Behavior:**
- Clicking YouTube link auto-marks as listened
- Unified tracking with dashboard (same API, same database record)
- Optimistic UI updates

### Files to modify:

| File | Action |
|------|--------|
| `/frontend/src/app/services/[id]/page.tsx` | Use expandable rows |
| `/frontend/src/components/worship-set/expandable-song-row.tsx` | Create new component |

---

## Phase 5: Frontend API Routes

### New routes to create:

| File | Methods |
|------|---------|
| `/frontend/src/app/api/set-songs/[id]/listened/route.ts` | POST, DELETE |
| `/frontend/src/app/api/users/[id]/song-progress/route.ts` | GET |

---

## Edge Cases & Error Handling

### Edge cases:

1. **No YouTube URL available** - Don't show YouTube button, but still allow manual "listened" toggle

2. **User not assigned to service** - Don't show progress tracking or "Songs to Practice" for unassigned services

3. **SetSong removed from worship set** - CASCADE delete removes UserSetSongProgress records

4. **User clicks YouTube link but network fails** - Still mark as listened (click intent matters)

5. **Service date passes** - Keep showing until 24 hours after service date, then hide from dashboard

6. **Multiple assignments to same service** - Show each song once (deduplicate by setSong)

### Error handling:

- API failures show toast notification but don't break UI
- Optimistic UI updates for listened toggle (immediate feedback, rollback on error)
- Loading skeletons for dashboard section while fetching

---

## YouTube URL Resolution

Priority order for determining which YouTube URL to display:

1. `SetSong.youtubeUrlOverride` (worship leader can override for specific service)
2. `SongVersion.youtubeUrl` (version-specific URL)
3. `Song.defaultYoutubeUrl` (fallback default)

Helper function:
```typescript
function getYoutubeUrl(setSong: SetSong): string | null {
  return setSong.youtubeUrlOverride
    || setSong.songVersion?.youtubeUrl
    || setSong.songVersion?.song?.defaultYoutubeUrl
    || null;
}
```

---

## Summary of Changes

| Type | File | Action |
|------|------|--------|
| Schema | `/backend/prisma/schema.prisma` | Modify |
| Validation | `/backend/src/validation/setSongsSchemas.ts` | Modify |
| Controller | `/backend/src/controllers/setSongsController.ts` | Modify |
| Controller | `/backend/src/controllers/usersController.ts` | Modify |
| Controller | `/backend/src/controllers/servicesController.ts` | Modify |
| Routes | `/backend/src/routes/setSongs.ts` | Modify |
| Routes | `/backend/src/routes/users.ts` | Modify |
| API Route | `/frontend/src/app/api/set-songs/[id]/listened/route.ts` | Create |
| API Route | `/frontend/src/app/api/users/[id]/song-progress/route.ts` | Create |
| Component | `/frontend/src/components/dashboard/songs-to-practice.tsx` | Create |
| Component | `/frontend/src/components/worship-set/expandable-song-row.tsx` | Create |
| Page | `/frontend/src/app/page.tsx` | Modify |
| Page | `/frontend/src/app/services/[id]/page.tsx` | Modify |
