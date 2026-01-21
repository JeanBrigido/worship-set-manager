import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface RequestWithFile extends Request {
  user?: JwtPayload;
  file?: MulterFile;
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
    if (existing.fileUrl && existing.fileName) {
      const filePath = `${id}/${existing.fileName}`;
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
export const uploadChordSheetFile = async (req: RequestWithFile, res: Response) => {
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

    if (existing?.fileUrl && existing?.fileName) {
      const oldPath = `${id}/${existing.fileName}`;
      await supabase.storage.from("chord-sheets").remove([oldPath]);
    }

    // Sanitize filename to prevent path traversal
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Upload new file
    const filePath = `${id}/${safeFileName}`;
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
      update: { fileUrl: urlData.publicUrl, fileName: safeFileName },
      create: { songVersionId: id, fileUrl: urlData.publicUrl, fileName: safeFileName },
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
  // Extract root note for flat key detection (handles minor keys like "Dm", "Fm")
  const rootNote = toKey.replace(/m.*$/, '');
  const useFlats = toKey.includes("b") || ["F", "Bb", "Eb", "Ab", "Db", "Gb"].includes(rootNote);

  // Match chord patterns in brackets: [Am7], [C#], [Gmaj7], etc.
  return text.replace(/\[([A-G][#b]?)([^\]]*)\]/g, (match, root, suffix) => {
    const transposed = transposeNote(root, semitones, useFlats);
    return `[${transposed}${suffix}]`;
  });
}
