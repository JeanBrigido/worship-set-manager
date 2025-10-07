import { z } from "zod";

export const createSuggestionSchema = z.object({
  slotId: z.string().uuid("Must be a valid UUID"),
  songId: z.string().uuid("Must be a valid UUID"),
  youtubeUrlOverride: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});

export const updateSuggestionSchema = z.object({
  youtubeUrlOverride: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});
