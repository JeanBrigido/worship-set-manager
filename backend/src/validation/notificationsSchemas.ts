import { z } from "zod";
import { Channel } from "@prisma/client";

export const createNotificationSchema = z.object({
  userId: z.string().uuid("Must be a valid UUID"),
  channel: z.nativeEnum(Channel),
  templateKey: z.string().min(1, "Template key is required"),
  payloadJson: z.any(), // you may refine later if you know structure
  status: z.string().min(1, "Status is required"),
});
