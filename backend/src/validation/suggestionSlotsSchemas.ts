import { z } from "zod";
import { SlotStatus } from "@prisma/client";

export const createSuggestionSlotSchema = z.object({
  setId: z.string().uuid("Must be a valid UUID"),
  assignedUserId: z.string().uuid("Must be a valid UUID"),
  minSongs: z.number().int().min(1),
  maxSongs: z.number().int().min(1),
  dueAt: z.string().datetime("Must be a valid ISO datetime"),
});

export const updateSuggestionSlotSchema = z.object({
  minSongs: z.number().int().min(1).optional(),
  maxSongs: z.number().int().min(1).optional(),
  dueAt: z.string().datetime().optional(),
  status: z.nativeEnum(SlotStatus).optional(),
});
