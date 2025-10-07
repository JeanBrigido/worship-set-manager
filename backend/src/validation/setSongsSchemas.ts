import { z } from "zod";

export const createSetSongSchema = z.object({
  setId: z.string().uuid("Must be a valid UUID"),
  songVersionId: z.string().uuid("Must be a valid UUID"),
  position: z.number().int().min(1, "Position must be >= 1"),
  keyOverride: z.string().optional(),
  youtubeUrlOverride: z.string().url().optional(),
  isNew: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export const updateSetSongSchema = z.object({
  position: z.number().int().min(1).optional(),
  keyOverride: z.string().optional(),
  youtubeUrlOverride: z.string().url().optional(),
  isNew: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});
