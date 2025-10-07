import { z } from "zod";

export const createAvailabilitySchema = z.object({
  start: z.string().datetime("Must be a valid ISO datetime"),
  end: z.string().datetime("Must be a valid ISO datetime"),
  notes: z.string().max(500).optional(),
});

export const updateAvailabilitySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});
