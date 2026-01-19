import { z } from "zod";

export const createInstrumentSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  displayName: z.string().min(1, "Display name is required").max(100),
  maxPerSet: z.coerce.number().int().min(1, "Max per set must be at least 1"),
});

export const updateInstrumentSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  displayName: z.string().min(1).max(100).optional(),
  maxPerSet: z.coerce.number().int().min(1).optional(),
});
