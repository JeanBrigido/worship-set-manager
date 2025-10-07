import { z } from "zod";

export const createServiceTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  defaultStartTime: z.string().min(1, "Default start time is required"), // could validate HH:mm format later
  rrule: z.string().optional(),
});

export const updateServiceTypeSchema = z.object({
  name: z.string().min(1).optional(),
  defaultStartTime: z.string().optional(),
  rrule: z.string().optional(),
});
