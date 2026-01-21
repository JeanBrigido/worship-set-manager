# Chord Sheets Feature Design

## Overview

Consolidate chord sheets so all worship team members use the same chords. Supports text-based chords with automatic transposition, PDF/image uploads, and external URL links.

## Data Model

Add `ChordSheet` model linked to `SongVersion`:

```prisma
model ChordSheet {
  id            String   @id @default(uuid())
  songVersionId String   @unique

  // Text chords (ChordPro-style, transposable)
  chordText     String?
  originalKey   String?  // Key the text chords are written in

  // PDF/Image upload (via Supabase Storage)
  fileUrl       String?
  fileName      String?

  // External link (CCLI, LaCuerda, etc.)
  externalUrl   String?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  songVersion   SongVersion @relation(fields: [songVersionId], references: [id], onDelete: Cascade)
}
```

Key points:
- One chord sheet per song version (`@unique` on songVersionId)
- Three optional fields for hybrid approach - use whichever fits
- `originalKey` stores what key text chords are written in for transposition
- When displaying for a service, compare `originalKey` to `SetSong.keyOverride` (or `SongVersion.defaultKey`) and transpose accordingly

## API Endpoints

### Backend routes

| Method | Endpoint | Who | Purpose |
|--------|----------|-----|---------|
| GET | `/song-versions/:id/chord-sheet` | Any authenticated | Get chord sheet for a version |
| PUT | `/song-versions/:id/chord-sheet` | Admin/Leader | Create or update chord sheet |
| DELETE | `/song-versions/:id/chord-sheet` | Admin/Leader | Remove chord sheet |
| POST | `/song-versions/:id/chord-sheet/upload` | Admin/Leader | Upload PDF/image to Supabase Storage |
| GET | `/set-songs/:id/chord-sheet` | Any authenticated | Get chord sheet transposed to service key |

### Frontend API routes (Next.js proxies to backend)

- `/api/song-versions/[id]/chord-sheet`
- `/api/song-versions/[id]/chord-sheet/upload`
- `/api/set-songs/[id]/chord-sheet`

## Frontend Pages & Components

### New pages

1. **`/set-songs/[id]/chords`** - Dedicated chord viewer page
   - Full-screen view optimized for phones/tablets
   - Shows song title, artist, key (transposed)
   - Renders text chords with chords above lyrics
   - Or displays PDF/image if uploaded
   - Or links out to external URL
   - Large readable font, clean layout

2. **`/songs/[id]/versions/[versionId]/chord-sheet/edit`** - Edit page for admin/leaders
   - Text editor for inline chords with preview
   - File upload for PDF/image
   - External URL input field
   - Original key selector (for transposition base)

### Updated components

3. **Dashboard "Songs to Practice"** - Add chord sheet icon/link next to each song if chord sheet exists

4. **Service page song list** - Add chord sheet icon/link in expandable row if chord sheet exists

### New components

5. **`ChordSheetRenderer`** - Parses inline chords and renders as chords-above-lyrics format. Handles transposition logic.

6. **`ChordSheetEditor`** - Text editor with live preview for entering chord sheets.

## Text Chord Format

### Input format (inline chords)

```
[G]Amazing [C]grace, how [G]sweet the sound
That [G]saved a [G7]wretch like [C]me
```

### Rendered output (chords above lyrics)

```
G        C          G
Amazing grace, how sweet the sound
G        G7         C
That saved a wretch like me
```

## Transposition Logic

### Algorithm

1. Calculate semitone difference between `originalKey` and `targetKey`
   - Example: G to B = +4 semitones

2. For each chord, shift root note by that interval
   - G → B
   - C → E
   - D → F#
   - Am → C#m

3. Preserve chord quality (m, 7, maj7, sus4, etc.)

### Enharmonic handling

- Prefer sharps or flats based on target key signature
- B major → use F# not Gb
- F major → use Bb not A#

## File Upload Flow

### Supabase Storage setup

1. Create `chord-sheets` bucket in Supabase Storage
2. Files stored with path: `chord-sheets/{songVersionId}/{filename}`
3. Access controlled via Supabase policies (authenticated users read, admin/leaders write)

### Upload flow

1. User selects PDF/image file in edit form
2. Frontend calls `/api/song-versions/[id]/chord-sheet/upload` with file
3. Backend uploads to Supabase Storage, gets public URL
4. Backend updates `ChordSheet` record with `fileUrl` and `fileName`
5. Old file deleted from storage if replacing

### File limits

- Max file size: 5MB
- Allowed types: PDF, PNG, JPG

## Permissions

- **View chord sheets**: Any authenticated user
- **Edit chord sheets**: Admin and Leader roles only

## Implementation Files

### Files to create

| Type | File | Purpose |
|------|------|---------|
| Schema | `backend/prisma/schema.prisma` | Add ChordSheet model |
| Validation | `backend/src/validation/chordSheetsSchemas.ts` | Zod schemas |
| Controller | `backend/src/controllers/chordSheetsController.ts` | CRUD + upload logic |
| Routes | `backend/src/routes/chordSheets.ts` | Register endpoints |
| Component | `frontend/src/components/chord-sheet/chord-sheet-renderer.tsx` | Parse & render chords |
| Component | `frontend/src/components/chord-sheet/chord-sheet-editor.tsx` | Text editor with preview |
| Page | `frontend/src/app/set-songs/[id]/chords/page.tsx` | Dedicated viewer |
| Page | `frontend/src/app/songs/[id]/versions/[versionId]/chord-sheet/edit/page.tsx` | Edit page |
| API Route | `frontend/src/app/api/song-versions/[id]/chord-sheet/route.ts` | Proxy to backend |
| API Route | `frontend/src/app/api/song-versions/[id]/chord-sheet/upload/route.ts` | File upload |
| API Route | `frontend/src/app/api/set-songs/[id]/chord-sheet/route.ts` | Transposed fetch |

### Files to modify

| File | Change |
|------|--------|
| `frontend/src/components/dashboard/songs-to-practice.tsx` | Add chord sheet link |
| `frontend/src/components/worship-set/expandable-song-row.tsx` | Add chord sheet link |
| `backend/src/index.ts` | Register chord sheet routes |
