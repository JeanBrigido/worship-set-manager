# Chord Sheets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add chord sheet support to song versions with text-based transposition, PDF uploads, and external URLs.

**Architecture:** ChordSheet model linked 1:1 to SongVersion. Backend handles CRUD + file uploads to Supabase Storage. Frontend provides viewer page with transposition and editor for admin/leaders.

**Tech Stack:** Prisma, Express, Zod, Next.js 14, Supabase Storage, React

---

## Task 1: Database Schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: Add ChordSheet model to schema**

Add after the `SongVersion` model:

```prisma
model ChordSheet {
  id            String   @id @default(uuid())
  songVersionId String   @unique
  chordText     String?
  originalKey   String?
  fileUrl       String?
  fileName      String?
  externalUrl   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  songVersion   SongVersion @relation(fields: [songVersionId], references: [id], onDelete: Cascade)
}
```

Add to SongVersion model:

```prisma
chordSheet    ChordSheet?
```

**Step 2: Generate Prisma client and push schema**

Run: `npm run db:generate --workspace=backend && npm run db:push --workspace=backend`
Expected: Schema synced, ChordSheet table created

**Step 3: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: add ChordSheet model to schema"
```

---

## Task 2: Backend Validation Schemas

**Files:**
- Create: `backend/src/validation/chordSheetsSchemas.ts`
- Modify: `backend/src/validation/index.ts`

**Step 1: Create validation schemas**

Create `backend/src/validation/chordSheetsSchemas.ts`:

```typescript
import { z } from "zod";

export const upsertChordSheetSchema = z.object({
  chordText: z.string().max(50000).nullable().optional(),
  originalKey: z.string().max(10).nullable().optional(),
  externalUrl: z.string().url().nullable().optional(),
});
```

**Step 2: Export from index**

Add to `backend/src/validation/index.ts`:

```typescript
export * from "./chordSheetsSchemas";
```

**Step 3: Commit**

```bash
git add backend/src/validation/chordSheetsSchemas.ts backend/src/validation/index.ts
git commit -m "feat: add chord sheet validation schemas"
```

---

## Task 3: Backend Controller

**Files:**
- Create: `backend/src/controllers/chordSheetsController.ts`

**Step 1: Create controller with all functions**

Create `backend/src/controllers/chordSheetsController.ts`:

```typescript
import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

/**
 * GET /song-versions/:id/chord-sheet
 * Get chord sheet for a song version
 */
export const getChordSheet = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;

    const chordSheet = await prisma.chordSheet.findUnique({
      where: { songVersionId: id },
    });

    if (!chordSheet) {
      return res.status(404).json({ error: { message: "Chord sheet not found" } });
    }

    res.json({ data: chordSheet });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch chord sheet" } });
  }
};

/**
 * PUT /song-versions/:id/chord-sheet
 * Create or update chord sheet (admin/leader only)
 */
export const upsertChordSheet = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;
    const { chordText, originalKey, externalUrl } = req.body;

    // Verify song version exists
    const songVersion = await prisma.songVersion.findUnique({
      where: { id },
    });

    if (!songVersion) {
      return res.status(404).json({ error: { message: "Song version not found" } });
    }

    const chordSheet = await prisma.chordSheet.upsert({
      where: { songVersionId: id },
      update: { chordText, originalKey, externalUrl },
      create: { songVersionId: id, chordText, originalKey, externalUrl },
    });

    res.json({ data: chordSheet });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not save chord sheet" } });
  }
};

/**
 * DELETE /song-versions/:id/chord-sheet
 * Delete chord sheet (admin/leader only)
 */
export const deleteChordSheet = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;

    const existing = await prisma.chordSheet.findUnique({
      where: { songVersionId: id },
    });

    if (!existing) {
      return res.status(404).json({ error: { message: "Chord sheet not found" } });
    }

    // Delete file from storage if exists
    if (existing.fileUrl) {
      const filePath = `chord-sheets/${id}/${existing.fileName}`;
      await supabase.storage.from("chord-sheets").remove([filePath]);
    }

    await prisma.chordSheet.delete({
      where: { songVersionId: id },
    });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not delete chord sheet" } });
  }
};

/**
 * POST /song-versions/:id/chord-sheet/upload
 * Upload PDF/image file (admin/leader only)
 */
export const uploadChordSheetFile = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;

    // Verify song version exists
    const songVersion = await prisma.songVersion.findUnique({
      where: { id },
    });

    if (!songVersion) {
      return res.status(404).json({ error: { message: "Song version not found" } });
    }

    if (!req.file) {
      return res.status(400).json({ error: { message: "No file provided" } });
    }

    const file = req.file;
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: { message: "Invalid file type. Allowed: PDF, PNG, JPG" } });
    }

    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: { message: "File too large. Max 5MB" } });
    }

    // Delete existing file if any
    const existing = await prisma.chordSheet.findUnique({
      where: { songVersionId: id },
    });

    if (existing?.fileUrl) {
      const oldPath = `chord-sheets/${id}/${existing.fileName}`;
      await supabase.storage.from("chord-sheets").remove([oldPath]);
    }

    // Upload new file
    const filePath = `chord-sheets/${id}/${file.originalname}`;
    const { error: uploadError } = await supabase.storage
      .from("chord-sheets")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return res.status(500).json({ error: { message: "Failed to upload file" } });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("chord-sheets")
      .getPublicUrl(filePath);

    // Upsert chord sheet record
    const chordSheet = await prisma.chordSheet.upsert({
      where: { songVersionId: id },
      update: { fileUrl: urlData.publicUrl, fileName: file.originalname },
      create: { songVersionId: id, fileUrl: urlData.publicUrl, fileName: file.originalname },
    });

    res.json({ data: chordSheet });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not upload file" } });
  }
};

/**
 * GET /set-songs/:id/chord-sheet
 * Get chord sheet for a set song, transposed to service key
 */
export const getTransposedChordSheet = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;

    const setSong = await prisma.setSong.findUnique({
      where: { id },
      include: {
        songVersion: {
          include: {
            song: true,
            chordSheet: true,
          },
        },
      },
    });

    if (!setSong) {
      return res.status(404).json({ error: { message: "Set song not found" } });
    }

    const chordSheet = setSong.songVersion.chordSheet;

    if (!chordSheet) {
      return res.status(404).json({ error: { message: "Chord sheet not found" } });
    }

    // Determine target key (keyOverride > defaultKey)
    const targetKey = setSong.keyOverride || setSong.songVersion.defaultKey;

    // If we have text chords and keys for transposition
    let transposedText = chordSheet.chordText;
    if (chordSheet.chordText && chordSheet.originalKey && targetKey && chordSheet.originalKey !== targetKey) {
      transposedText = transposeChordText(chordSheet.chordText, chordSheet.originalKey, targetKey);
    }

    res.json({
      data: {
        ...chordSheet,
        chordText: transposedText,
        displayKey: targetKey || chordSheet.originalKey,
        songTitle: setSong.songVersion.song.title,
        songArtist: setSong.songVersion.song.artist,
        versionName: setSong.songVersion.name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch chord sheet" } });
  }
};

// Transposition helper
const CHROMATIC_SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const CHROMATIC_FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function normalizeNote(note: string): number {
  const normalized = note.replace(/b/, "b").replace(/#/, "#");
  let idx = CHROMATIC_SHARPS.indexOf(normalized);
  if (idx === -1) idx = CHROMATIC_FLATS.indexOf(normalized);
  return idx;
}

function transposeNote(note: string, semitones: number, useFlats: boolean): string {
  const idx = normalizeNote(note);
  if (idx === -1) return note;
  const newIdx = (idx + semitones + 12) % 12;
  return useFlats ? CHROMATIC_FLATS[newIdx] : CHROMATIC_SHARPS[newIdx];
}

function transposeChordText(text: string, fromKey: string, toKey: string): string {
  const fromIdx = normalizeNote(fromKey);
  const toIdx = normalizeNote(toKey);
  if (fromIdx === -1 || toIdx === -1) return text;

  const semitones = (toIdx - fromIdx + 12) % 12;
  const useFlats = toKey.includes("b") || ["F", "Bb", "Eb", "Ab", "Db", "Gb"].includes(toKey);

  // Match chord patterns in brackets: [Am7], [C#], [Gmaj7], etc.
  return text.replace(/\[([A-G][#b]?)([^\]]*)\]/g, (match, root, suffix) => {
    const transposed = transposeNote(root, semitones, useFlats);
    return `[${transposed}${suffix}]`;
  });
}
```

**Step 2: Commit**

```bash
git add backend/src/controllers/chordSheetsController.ts
git commit -m "feat: add chord sheets controller with transposition"
```

---

## Task 4: Backend Routes

**Files:**
- Create: `backend/src/routes/chordSheets.ts`
- Modify: `backend/src/index.ts`

**Step 1: Create routes file**

Create `backend/src/routes/chordSheets.ts`:

```typescript
import { Router } from "express";
import multer from "multer";
import * as chordSheetsController from "../controllers/chordSheetsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get chord sheet for a song version (any authenticated user)
router.get(
  "/song-versions/:id/chord-sheet",
  authMiddleware,
  chordSheetsController.getChordSheet
);

// Create/update chord sheet (admin/leader only)
router.put(
  "/song-versions/:id/chord-sheet",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  validateRequest("upsertChordSheetSchema"),
  chordSheetsController.upsertChordSheet
);

// Delete chord sheet (admin/leader only)
router.delete(
  "/song-versions/:id/chord-sheet",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  chordSheetsController.deleteChordSheet
);

// Upload chord sheet file (admin/leader only)
router.post(
  "/song-versions/:id/chord-sheet/upload",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  upload.single("file"),
  chordSheetsController.uploadChordSheetFile
);

// Get transposed chord sheet for a set song (any authenticated user)
router.get(
  "/set-songs/:id/chord-sheet",
  authMiddleware,
  chordSheetsController.getTransposedChordSheet
);

export default router;
```

**Step 2: Register routes in index.ts**

Add to the routes array in `backend/src/index.ts`:

```typescript
{ path: "/api", file: "./routes/chordSheets", name: "Chord Sheets" },
```

**Step 3: Install multer if not present**

Run: `npm install multer --workspace=backend && npm install @types/multer --save-dev --workspace=backend`

**Step 4: Commit**

```bash
git add backend/src/routes/chordSheets.ts backend/src/index.ts backend/package.json
git commit -m "feat: add chord sheets routes"
```

---

## Task 5: Frontend API Routes

**Files:**
- Create: `frontend/src/app/api/song-versions/[id]/chord-sheet/route.ts`
- Create: `frontend/src/app/api/song-versions/[id]/chord-sheet/upload/route.ts`
- Create: `frontend/src/app/api/set-songs/[id]/chord-sheet/route.ts`

**Step 1: Create song-versions chord-sheet route**

Create `frontend/src/app/api/song-versions/[id]/chord-sheet/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { generateJwtToken } from '@/lib/jwt'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await generateJwtToken()

    const response = await fetch(`${API_BASE}/api/song-versions/${params.id}/chord-sheet`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch chord sheet' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await generateJwtToken()
    const body = await request.json()

    const response = await fetch(`${API_BASE}/api/song-versions/${params.id}/chord-sheet`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || 'Failed to save chord sheet' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await generateJwtToken()

    const response = await fetch(`${API_BASE}/api/song-versions/${params.id}/chord-sheet`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || 'Failed to delete chord sheet' },
        { status: response.status }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Create upload route**

Create `frontend/src/app/api/song-versions/[id]/chord-sheet/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { generateJwtToken } from '@/lib/jwt'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await generateJwtToken()
    const formData = await request.formData()

    const response = await fetch(`${API_BASE}/api/song-versions/${params.id}/chord-sheet/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || 'Failed to upload file' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 3: Create set-songs chord-sheet route**

Create `frontend/src/app/api/set-songs/[id]/chord-sheet/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { generateJwtToken } from '@/lib/jwt'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await generateJwtToken()

    const response = await fetch(`${API_BASE}/api/set-songs/${params.id}/chord-sheet`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch chord sheet' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 4: Commit**

```bash
git add frontend/src/app/api/song-versions/[id]/chord-sheet/ frontend/src/app/api/set-songs/[id]/chord-sheet/
git commit -m "feat: add frontend API routes for chord sheets"
```

---

## Task 6: Chord Sheet Renderer Component

**Files:**
- Create: `frontend/src/components/chord-sheet/chord-sheet-renderer.tsx`

**Step 1: Create the renderer component**

Create `frontend/src/components/chord-sheet/chord-sheet-renderer.tsx`:

```typescript
'use client'

interface ChordSheetRendererProps {
  chordText: string
  className?: string
}

interface ParsedLine {
  type: 'lyrics-with-chords' | 'empty'
  lyrics: string
  chords: { position: number; chord: string }[]
}

function parseChordText(text: string): ParsedLine[] {
  const lines = text.split('\n')
  return lines.map((line) => {
    if (!line.trim()) {
      return { type: 'empty' as const, lyrics: '', chords: [] }
    }

    const chords: { position: number; chord: string }[] = []
    let lyrics = ''
    let currentPos = 0

    // Parse [Chord] patterns and extract position
    const regex = /\[([^\]]+)\]/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(line)) !== null) {
      // Add text before this chord
      lyrics += line.slice(lastIndex, match.index)
      currentPos = lyrics.length
      chords.push({ position: currentPos, chord: match[1] })
      lastIndex = match.index + match[0].length
    }

    // Add remaining text after last chord
    lyrics += line.slice(lastIndex)

    return { type: 'lyrics-with-chords' as const, lyrics, chords }
  })
}

export function ChordSheetRenderer({ chordText, className = '' }: ChordSheetRendererProps) {
  const parsedLines = parseChordText(chordText)

  return (
    <div className={`font-mono text-sm whitespace-pre-wrap ${className}`}>
      {parsedLines.map((line, lineIdx) => {
        if (line.type === 'empty') {
          return <div key={lineIdx} className="h-4" />
        }

        // Build chord line with proper spacing
        let chordLine = ''
        let lastEnd = 0
        for (const { position, chord } of line.chords) {
          // Add spaces to reach this position
          while (chordLine.length < position) {
            chordLine += ' '
          }
          chordLine += chord
          lastEnd = chordLine.length
        }

        const hasChords = line.chords.length > 0

        return (
          <div key={lineIdx} className="leading-relaxed">
            {hasChords && (
              <div className="text-primary font-bold h-5">{chordLine}</div>
            )}
            <div className={hasChords ? '' : 'h-5'}>{line.lyrics || '\u00A0'}</div>
          </div>
        )
      })}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/chord-sheet/chord-sheet-renderer.tsx
git commit -m "feat: add chord sheet renderer component"
```

---

## Task 7: Chord Sheet Editor Component

**Files:**
- Create: `frontend/src/components/chord-sheet/chord-sheet-editor.tsx`

**Step 1: Create the editor component**

Create `frontend/src/components/chord-sheet/chord-sheet-editor.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChordSheetRenderer } from './chord-sheet-renderer'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api-client'
import { Upload, Link, FileText, Save, Trash2 } from 'lucide-react'

const KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']

interface ChordSheet {
  id: string
  songVersionId: string
  chordText: string | null
  originalKey: string | null
  fileUrl: string | null
  fileName: string | null
  externalUrl: string | null
}

interface ChordSheetEditorProps {
  songVersionId: string
  initialData?: ChordSheet | null
  onSave?: (chordSheet: ChordSheet) => void
  onDelete?: () => void
}

export function ChordSheetEditor({
  songVersionId,
  initialData,
  onSave,
  onDelete,
}: ChordSheetEditorProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [chordText, setChordText] = useState(initialData?.chordText || '')
  const [originalKey, setOriginalKey] = useState(initialData?.originalKey || '')
  const [externalUrl, setExternalUrl] = useState(initialData?.externalUrl || '')
  const [fileUrl, setFileUrl] = useState(initialData?.fileUrl || '')
  const [fileName, setFileName] = useState(initialData?.fileName || '')

  const handleSaveText = async () => {
    try {
      setSaving(true)
      const { data, error } = await apiClient.put(`/song-versions/${songVersionId}/chord-sheet`, {
        chordText: chordText || null,
        originalKey: originalKey || null,
        externalUrl: externalUrl || null,
      })

      if (error) throw new Error(error.message)

      toast({ title: 'Chord sheet saved' })
      onSave?.(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not save chord sheet',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/song-versions/${songVersionId}/chord-sheet/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Upload failed')
      }

      const { data } = await response.json()

      setFileUrl(data.fileUrl)
      setFileName(data.fileName)

      toast({ title: 'File uploaded' })
      onSave?.(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not upload file',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this chord sheet?')) return

    try {
      setDeleting(true)
      const { error } = await apiClient.delete(`/song-versions/${songVersionId}/chord-sheet`)

      if (error) throw new Error(error.message)

      setChordText('')
      setOriginalKey('')
      setExternalUrl('')
      setFileUrl('')
      setFileName('')

      toast({ title: 'Chord sheet deleted' })
      onDelete?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not delete chord sheet',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const hasContent = chordText || fileUrl || externalUrl

  return (
    <div className="space-y-6">
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Text Chords
          </TabsTrigger>
          <TabsTrigger value="file" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            PDF/Image
          </TabsTrigger>
          <TabsTrigger value="link" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            External Link
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="originalKey">Original Key</Label>
              <Select value={originalKey} onValueChange={setOriginalKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select key" />
                </SelectTrigger>
                <SelectContent>
                  {KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chordText">Chord Text</Label>
              <Textarea
                id="chordText"
                value={chordText}
                onChange={(e) => setChordText(e.target.value)}
                placeholder="[G]Amazing [C]grace, how [G]sweet the sound..."
                className="font-mono min-h-[300px]"
              />
              <p className="text-xs text-muted-foreground">
                Use [Chord] notation: [G]word [Am]another
              </p>
            </div>

            <div className="space-y-2">
              <Label>Preview</Label>
              <Card className="min-h-[300px] overflow-auto">
                <CardContent className="p-4">
                  {chordText ? (
                    <ChordSheetRenderer chordText={chordText} />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Enter chords to see preview
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Button onClick={handleSaveText} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Text Chords'}
          </Button>
        </TabsContent>

        <TabsContent value="file" className="space-y-4">
          <div className="space-y-2">
            <Label>Upload PDF or Image</Label>
            <Input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              Max 5MB. Supported: PDF, PNG, JPG
            </p>
          </div>

          {fileUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current File</CardTitle>
                <CardDescription>{fileName}</CardDescription>
              </CardHeader>
              <CardContent>
                {fileUrl.endsWith('.pdf') ? (
                  <iframe src={fileUrl} className="w-full h-96 border rounded" />
                ) : (
                  <img src={fileUrl} alt="Chord sheet" className="max-w-full rounded" />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="link" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="externalUrl">External URL</Label>
            <Input
              id="externalUrl"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://example.com/chord-sheet"
            />
            <p className="text-xs text-muted-foreground">
              Link to CCLI, LaCuerda, or other chord sheet source
            </p>
          </div>

          <Button onClick={handleSaveText} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save External Link'}
          </Button>
        </TabsContent>
      </Tabs>

      {hasContent && (
        <div className="pt-4 border-t">
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete Chord Sheet'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/chord-sheet/chord-sheet-editor.tsx
git commit -m "feat: add chord sheet editor component"
```

---

## Task 8: Chord Viewer Page

**Files:**
- Create: `frontend/src/app/set-songs/[id]/chords/page.tsx`

**Step 1: Create the viewer page**

Create `frontend/src/app/set-songs/[id]/chords/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChordSheetRenderer } from '@/components/chord-sheet/chord-sheet-renderer'
import { apiClient } from '@/lib/api-client'
import { ArrowLeft, ExternalLink, Music2, FileText } from 'lucide-react'

interface TransposedChordSheet {
  id: string
  chordText: string | null
  originalKey: string | null
  fileUrl: string | null
  fileName: string | null
  externalUrl: string | null
  displayKey: string | null
  songTitle: string
  songArtist: string | null
  versionName: string
}

export default function ChordViewerPage() {
  const params = useParams()
  const router = useRouter()
  const setSongId = params.id as string

  const [chordSheet, setChordSheet] = useState<TransposedChordSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchChordSheet()
  }, [setSongId])

  const fetchChordSheet = async () => {
    try {
      setLoading(true)
      const { data, error } = await apiClient.get<TransposedChordSheet>(
        `/set-songs/${setSongId}/chord-sheet`
      )

      if (error) {
        setError(error.message)
        return
      }

      setChordSheet(data)
    } catch (err) {
      setError('Could not load chord sheet')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-4xl py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !chordSheet) {
    return (
      <div className="container max-w-4xl py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {error || 'No chord sheet available for this song'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{chordSheet.songTitle}</h1>
        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
          {chordSheet.songArtist && <span>{chordSheet.songArtist}</span>}
          {chordSheet.versionName && (
            <>
              <span>•</span>
              <span>{chordSheet.versionName}</span>
            </>
          )}
        </div>
        {chordSheet.displayKey && (
          <Badge variant="outline" className="mt-2">
            <Music2 className="h-3 w-3 mr-1" />
            Key of {chordSheet.displayKey}
          </Badge>
        )}
      </div>

      {/* Text chords */}
      {chordSheet.chordText && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <ChordSheetRenderer
              chordText={chordSheet.chordText}
              className="text-base"
            />
          </CardContent>
        </Card>
      )}

      {/* PDF/Image */}
      {chordSheet.fileUrl && (
        <Card className="mb-6">
          <CardContent className="p-6">
            {chordSheet.fileUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={chordSheet.fileUrl}
                className="w-full h-[80vh] border-0 rounded"
                title="Chord sheet PDF"
              />
            ) : (
              <img
                src={chordSheet.fileUrl}
                alt="Chord sheet"
                className="max-w-full mx-auto rounded"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* External link */}
      {chordSheet.externalUrl && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              View chord sheet on external site
            </p>
            <Button asChild>
              <a
                href={chordSheet.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Chord Sheet
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/app/set-songs/[id]/chords/page.tsx
git commit -m "feat: add chord sheet viewer page"
```

---

## Task 9: Chord Sheet Edit Page

**Files:**
- Create: `frontend/src/app/songs/[id]/versions/[versionId]/chord-sheet/page.tsx`

**Step 1: Create the edit page**

Create `frontend/src/app/songs/[id]/versions/[versionId]/chord-sheet/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChordSheetEditor } from '@/components/chord-sheet/chord-sheet-editor'
import { apiClient } from '@/lib/api-client'
import { ArrowLeft } from 'lucide-react'

interface SongVersion {
  id: string
  name: string
  song: {
    id: string
    title: string
    artist: string | null
  }
  chordSheet?: {
    id: string
    chordText: string | null
    originalKey: string | null
    fileUrl: string | null
    fileName: string | null
    externalUrl: string | null
  } | null
}

export default function ChordSheetEditPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()

  const songId = params.id as string
  const versionId = params.versionId as string

  const [songVersion, setSongVersion] = useState<SongVersion | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdminOrLeader = session?.user?.roles?.some(
    (r: string) => r === 'admin' || r === 'leader'
  )

  useEffect(() => {
    fetchSongVersion()
  }, [versionId])

  const fetchSongVersion = async () => {
    try {
      setLoading(true)
      const { data, error } = await apiClient.get<SongVersion>(
        `/song-versions/${versionId}`
      )

      if (error) {
        console.error(error)
        return
      }

      // Also fetch chord sheet if exists
      const { data: chordSheet } = await apiClient.get(
        `/song-versions/${versionId}/chord-sheet`
      )

      setSongVersion({
        ...data,
        chordSheet: chordSheet || null,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-4xl py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!songVersion) {
    return (
      <div className="container max-w-4xl py-8">
        <p>Song version not found</p>
      </div>
    )
  }

  if (!isAdminOrLeader) {
    return (
      <div className="container max-w-4xl py-8">
        <p>You don't have permission to edit chord sheets</p>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Chord Sheet</CardTitle>
          <CardDescription>
            {songVersion.song.title} - {songVersion.name}
            {songVersion.song.artist && ` by ${songVersion.song.artist}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChordSheetEditor
            songVersionId={versionId}
            initialData={songVersion.chordSheet}
            onSave={() => fetchSongVersion()}
            onDelete={() => fetchSongVersion()}
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/app/songs/[id]/versions/[versionId]/chord-sheet/page.tsx
git commit -m "feat: add chord sheet edit page"
```

---

## Task 10: Add Chord Sheet Links to Existing Components

**Files:**
- Modify: `frontend/src/components/worship-set/expandable-song-row.tsx`
- Modify: `frontend/src/components/dashboard/songs-to-practice.tsx`

**Step 1: Add chord sheet link to expandable-song-row.tsx**

Add import at top:

```typescript
import { FileMusic } from 'lucide-react'
import Link from 'next/link'
```

Add `hasChordSheet` to the SetSong interface:

```typescript
interface SetSong {
  id: string
  // ... existing fields
  songVersion: {
    // ... existing fields
    chordSheet?: {
      id: string
    } | null
  }
}
```

Add chord sheet button in the expanded content section, after the YouTube button:

```typescript
{setSong.songVersion.chordSheet && (
  <Link href={`/set-songs/${setSong.id}/chords`}>
    <Button
      variant="outline"
      size="sm"
      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 border-purple-200 dark:border-purple-800"
    >
      <FileMusic className="h-4 w-4 mr-1" />
      View Chords
    </Button>
  </Link>
)}
```

**Step 2: Add chord sheet link to songs-to-practice.tsx**

Add import at top:

```typescript
import { FileMusic } from 'lucide-react'
```

Add `hasChordSheet` to SongProgress interface:

```typescript
interface SongProgress {
  // ... existing fields
  hasChordSheet: boolean
}
```

Add chord sheet button next to YouTube button in the song row:

```typescript
{song.hasChordSheet && (
  <Link href={`/set-songs/${song.setSong.id}/chords`}>
    <Button
      variant="ghost"
      size="sm"
      className="shrink-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
    >
      <FileMusic className="h-4 w-4 mr-1" />
      <span className="hidden sm:inline">Chords</span>
    </Button>
  </Link>
)}
```

**Step 3: Commit**

```bash
git add frontend/src/components/worship-set/expandable-song-row.tsx frontend/src/components/dashboard/songs-to-practice.tsx
git commit -m "feat: add chord sheet links to song components"
```

---

## Task 11: Update Backend to Include ChordSheet in Queries

**Files:**
- Modify: `backend/src/controllers/setSongsController.ts`
- Modify: `backend/src/controllers/usersController.ts`

**Step 1: Update setSongsController to include chordSheet**

In `listSetSongs`, `getSetSong`, `createSetSong`, `updateSetSong`, and `reorderSetSongs`, add `chordSheet` to the songVersion include:

```typescript
include: {
  songVersion: {
    include: {
      song: true,
      chordSheet: { select: { id: true } },
    },
  },
  singer: { select: { id: true, name: true } },
}
```

**Step 2: Update usersController getSongProgress to include hasChordSheet**

In the `getSongProgress` function, add `chordSheet` to the query and include `hasChordSheet` in the response mapping.

**Step 3: Commit**

```bash
git add backend/src/controllers/setSongsController.ts backend/src/controllers/usersController.ts
git commit -m "feat: include chord sheet presence in song queries"
```

---

## Task 12: Create Supabase Storage Bucket

**Manual Step:**

1. Go to Supabase Dashboard → Storage
2. Create new bucket named `chord-sheets`
3. Set bucket to public (for easy access to chord sheet files)
4. Add policy: Authenticated users can read, admin/leaders can write

---

## Summary

After completing all tasks:

1. Database has ChordSheet model linked to SongVersion
2. Backend provides CRUD endpoints for chord sheets with file upload support
3. Frontend has viewer page with transposition and editor for admin/leaders
4. Existing song components show chord sheet links when available
5. Supabase Storage bucket ready for PDF/image uploads

Test by:
1. Create a chord sheet for a song version (text, file, or URL)
2. Add that song to a worship set with a different key
3. View the chord sheet from the service page - should show transposed chords
4. View from dashboard "Songs to Practice" - should show chord sheet link
