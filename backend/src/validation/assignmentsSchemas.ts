import { z } from "zod";
import { AssignmentStatus } from "@prisma/client";

export const createAssignmentSchema = z.object({
  setId: z.string().uuid("Must be a valid UUID"),
  instrumentId: z.string().uuid("Must be a valid UUID"),
  userId: z.string().uuid("Must be a valid UUID"),
  status: z.nativeEnum(AssignmentStatus).optional(),
});

export const updateAssignmentSchema = z.object({
  status: z.nativeEnum(AssignmentStatus),
});
