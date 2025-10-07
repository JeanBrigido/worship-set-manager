import { z } from "zod";

// Accept both camelCase and snake_case for flexibility
export const createServiceSchema = z.object({
  date: z.string().datetime("Must be a valid ISO date"),
  serviceTypeId: z.string().uuid("Must be a valid UUID").optional(),
  service_type_id: z.string().uuid("Must be a valid UUID").optional(),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => data.serviceTypeId || data.service_type_id,
  { message: "Either serviceTypeId or service_type_id is required" }
);

export const updateServiceSchema = z.object({
  date: z.string().datetime().optional(),
  serviceTypeId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export const updateServiceAssignmentsSchema = z.object({
  assignments: z.record(z.string(), z.string())
});
