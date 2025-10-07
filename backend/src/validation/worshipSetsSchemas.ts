import { z } from "zod";
import { SetStatus } from "@prisma/client";

export const createWorshipSetSchema = z.object({
  serviceId: z.string().uuid("Must be a valid UUID"),
  suggestDueAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export const updateWorshipSetSchema = z.object({
  status: z.nativeEnum(SetStatus).optional(),
  suggestDueAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});
