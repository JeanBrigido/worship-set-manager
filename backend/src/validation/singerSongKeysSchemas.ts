import { z } from "zod";

export const createSingerSongKeySchema = z.object({
  singerId: z.string().uuid("Must be a valid UUID"),
  songId: z.string().uuid("Must be a valid UUID"),
  key: z.string().min(1, "Key is required").max(10, "Key must be 10 characters or less"),
  serviceDate: z.string().datetime({ message: "Must be a valid ISO date" }),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
});

export const updateSingerSongKeySchema = z.object({
  key: z.string().min(1).max(10).optional(),
  notes: z.string().max(500).nullable().optional(),
});
