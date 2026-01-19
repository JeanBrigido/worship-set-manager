# Feature Fixes Plan

**Goal:** Fix all identified bugs and missing functionality across Songs, Suggestions, Worship Sets, and Assignments features.

**Created:** 2026-01-19

---

## Priority Levels

- **P0 (Critical):** Breaks core functionality, runtime errors
- **P1 (High):** Significant bugs affecting user experience
- **P2 (Medium):** Missing functionality or inconsistencies
- **P3 (Low):** Minor issues, code quality improvements

---

## P0: Critical Issues

### 1. SongVersions routes not registered
**Feature:** Songs
**File:** `backend/src/index.ts`
**Problem:** Song versions API endpoints are completely inaccessible - the route file exists but is never registered.
**Fix:** Add `{ path: "/api/song-versions", file: "./routes/songVersions", name: "Song Versions" }` to routes array.
**Status:** ✅ Fixed

### 2. Missing instrument validation schemas
**Feature:** Assignments
**Files:**
- Create: `backend/src/validation/instrumentsSchemas.ts`
- Update: `backend/src/validation/index.ts`
- Update: `backend/src/middleware/validateRequest.ts`
**Problem:** Routes reference `createInstrumentSchema` and `updateInstrumentSchema` but they don't exist. Will cause runtime error.
**Fix:** Create schemas for code (string, required), displayName (string, required), maxPerSet (number, min 1).
**Status:** ✅ Fixed

### 3. Invalid default assignment status
**Feature:** Assignments
**File:** `backend/src/controllers/assignmentsController.ts:121`
**Problem:** Default status `'PENDING'` doesn't match enum (should be `'invited'`).
**Fix:** Change `'PENDING'` to `'invited'`.
**Status:** ✅ Fixed

### 4. Worship set route parameter mismatch
**Feature:** Worship Sets
**Files:**
- `backend/src/routes/worshipSets.ts`
- `frontend/src/app/api/worship-sets/route.ts`
**Problem:** Backend GET expects `serviceId`, frontend called wrong path. No list endpoint existed.
**Fix:** Added list endpoint, fixed frontend API route path.
**Status:** ✅ Fixed

---

## P1: High Priority Bugs

### 5. Frontend Song interface mismatches
**Feature:** Songs
**Files:**
- `frontend/src/app/songs/page.tsx`
- `frontend/src/app/songs/[id]/page.tsx`
- `frontend/src/app/songs/[id]/edit/page.tsx`
**Problem:** Interfaces include `key`, `tempo`, `ccli` fields that don't exist on Song model (they're on SongVersion).
**Fix:** Remove these fields from Song interface, add proper SongVersion handling.

### 6. Missing input validation on songs routes
**Feature:** Songs
**File:** `backend/src/routes/songs.ts`
**Problem:** POST/PUT routes don't use `validateRequest` middleware even though schemas exist.
**Fix:** Add `validateRequest("createSongSchema")` and `validateRequest("updateSongSchema")` to routes.

### 7. Suggestion due date check uses wrong field
**Feature:** Suggestions
**File:** `backend/src/controllers/suggestionsController.ts:65`
**Problem:** Checks `slot.worshipSet.suggestDueAt` instead of `slot.dueAt`.
**Fix:** Use `slot.dueAt` for the due date check.

### 8. Suggestions deleted on approve/reject (loses history)
**Feature:** Suggestions
**File:** `backend/src/controllers/suggestionsController.ts`
**Problem:** Approve and reject delete the suggestion record instead of marking with status.
**Fix:** Add `status` field to Suggestion model (`pending`, `approved`, `rejected`) and update instead of delete.

### 9. Service status and leaderId updates silently ignored
**Feature:** Worship Sets
**Files:**
- `backend/src/controllers/servicesController.ts`
- `backend/src/validation/servicesSchemas.ts`
**Problem:** Edit page sends `status` and `leaderId` but controller ignores them.
**Fix:** Add these fields to validation schema and controller update logic.

### 10. SetSong isNew flag never set based on familiarity
**Feature:** Worship Sets
**File:** `frontend/src/app/services/[id]/page.tsx`
**Problem:** When adding songs, `isNew` is always false regardless of `familiarityScore`.
**Fix:** Set `isNew: true` when `song.familiarityScore < 50` (or configurable threshold).

### 11. Assignment validation schemas not registered
**Feature:** Assignments
**File:** `backend/src/middleware/validateRequest.ts`
**Problem:** `createAssignmentSchema` and `updateAssignmentSchema` exist but aren't imported/registered.
**Fix:** Import and add to schemas object.

---

## P2: Medium Priority - Missing Functionality

### 12. No UI to manage song versions
**Feature:** Songs
**Files:** Frontend song pages
**Problem:** Backend has full CRUD for versions, but no UI exists.
**Fix:** Add versions section to song detail page with create/edit/delete capabilities.

### 13. No pagination or server-side filtering for songs
**Feature:** Songs
**Files:** Backend controller, frontend page
**Problem:** All songs loaded at once, only client-side filtering.
**Fix:** Add query params for pagination, search, and filtering.

### 14. Musicians cannot remove suggestions
**Feature:** Suggestions
**File:** `frontend/src/app/suggestions/my-assignments/page.tsx`
**Problem:** Can add suggestions but not remove them.
**Fix:** Add delete button with confirmation.

### 15. Suggestion slot status not auto-updated
**Feature:** Suggestions
**File:** `backend/src/controllers/suggestionsController.ts`
**Problem:** Slot stays `pending` even when min requirements met.
**Fix:** Auto-update to `submitted` when `suggestions.length >= slot.minSongs`.

### 16. No song removal from worship set UI
**Feature:** Worship Sets
**File:** `frontend/src/app/services/[id]/page.tsx`
**Problem:** Backend supports DELETE but UI doesn't expose it.
**Fix:** Add remove button to each song in the set list.

### 17. No song reordering in worship set
**Feature:** Worship Sets
**Files:** Frontend and backend
**Problem:** No drag-and-drop or other mechanism to reorder songs.
**Fix:** Add reorder endpoint and drag-and-drop UI.

### 18. publishWorshipSet function has no route
**Feature:** Worship Sets
**File:** `backend/src/routes/worshipSets.ts`
**Problem:** Function exists in controller but no route exposes it.
**Fix:** Add `POST /worship-sets/:id/publish` route.

### 19. No instrument management UI
**Feature:** Assignments
**Files:** Frontend
**Problem:** API exists but no admin UI for instruments.
**Fix:** Create `/admin/instruments` page with CRUD.

### 20. maxPerSet field never enforced
**Feature:** Assignments
**File:** `backend/src/controllers/assignmentsController.ts`
**Problem:** Instrument has `maxPerSet` but it's never validated.
**Fix:** Check count before creating assignment.

### 21. DefaultAssignment model unused
**Feature:** Assignments
**Problem:** Model exists but no API or UI uses it.
**Fix:** Create API routes and use for auto-populating assignments.

### 22. SetSong position gaps after delete
**Feature:** Worship Sets
**File:** `backend/src/controllers/setSongsController.ts`
**Problem:** Deleting a song leaves gaps in positions (1, 3, 4).
**Fix:** Reorder remaining songs after delete.

---

## P3: Low Priority - Code Quality

### 23. Inconsistent authorization (songs routes vs controller)
**Feature:** Songs
**Problem:** Route allows musician, controller rejects musician.
**Fix:** Remove redundant controller check or align with route.

### 24. Inconsistent error response format
**Feature:** Multiple
**Problem:** Some use `{ error: "string" }`, others use `{ error: { message } }`.
**Fix:** Standardize to `{ error: { message, code?, details? } }`.

### 25. Raw fetch vs apiClient inconsistency
**Feature:** Songs
**Files:** Song detail and edit pages
**Problem:** Some pages use `fetch()`, others use `apiClient`.
**Fix:** Standardize on `apiClient` everywhere.

### 26. Missing cascade deletes in schema
**Feature:** Multiple
**File:** `backend/prisma/schema.prisma`
**Problem:** Deleting parent records can fail due to foreign key constraints.
**Fix:** Add `onDelete: Cascade` where appropriate.

### 27. Client-side user filtering inefficient
**Feature:** Assignments
**File:** `frontend/src/app/services/[id]/assignments/page.tsx`
**Problem:** Loads all users, filters client-side.
**Fix:** Add server-side filtering by role.

### 28. Limited test coverage
**Feature:** All
**Problem:** Many scenarios untested.
**Fix:** Add tests for CRUD operations, edge cases, authorization.

---

## Implementation Order

**Phase 1: Critical Fixes (P0)** - Get app working
1. ✅ Register SongVersions routes
2. Add instrument validation schemas
3. Fix assignment default status
4. Fix worship set route mismatch

**Phase 2: High Priority (P1)** - Fix major bugs
5. Fix frontend Song interfaces
6. Add songs route validation
7. Fix suggestion due date check
8. Add suggestion status field (schema migration)
9. Fix service update to handle status/leaderId
10. Fix isNew flag logic
11. Register assignment validation schemas

**Phase 3: Missing Functionality (P2)** - Complete features
12-21. Add missing UI and functionality

**Phase 4: Code Quality (P3)** - Polish
22-28. Standardize patterns, add tests

---

## Notes

- Phase 1 should be done before any Playwright testing
- Phase 2 items affect user experience significantly
- Phase 3 can be prioritized based on user needs
- Some P2 items (like song versions UI) may be higher priority depending on usage
