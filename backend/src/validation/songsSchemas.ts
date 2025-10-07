import { z } from "zod";

export const createSongSchema = z.object({
  title: z.string().min(1, "Title is required"),
  artist: z.string().optional(),
  ccliNumber: z.string().optional(),
  defaultYoutubeUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  language: z.string().optional(),
  familiarityScore: z.number().min(0).max(100).optional(),
});

export const updateSongSchema = z.object({
  title: z.string().min(1).optional(),
  artist: z.string().optional(),
  ccliNumber: z.string().optional(),
  defaultYoutubeUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  language: z.string().optional(),
  familiarityScore: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});
