import { z } from "zod";

export const upsertChordSheetSchema = z.object({
  chordText: z.string().max(50000).nullable().optional(),
  originalKey: z.string().max(10).nullable().optional(),
  externalUrl: z.string().url().nullable().optional(),
});
