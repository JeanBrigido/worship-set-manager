import { z } from "zod";

export const createSongVersionSchema = z.object({
  songId: z.string().uuid("Must be a valid UUID"),
  name: z.string().min(1, "Name is required"),
  youtubeUrl: z.string().url().optional(),
  defaultKey: z.string().optional(),
  bpm: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const updateSongVersionSchema = z.object({
  name: z.string().min(1).optional(),
  youtubeUrl: z.string().url().optional(),
  defaultKey: z.string().optional(),
  bpm: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});
