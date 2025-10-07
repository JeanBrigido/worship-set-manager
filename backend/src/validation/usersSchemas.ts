import { z } from "zod";
import { Role } from "@prisma/client";

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phoneE164: z.string().regex(/^\+1\d{10}$/, "Must be a valid +1 E.164 phone").optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phoneE164: z.string().regex(/^\+1\d{10}$/).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roles: z.array(z.nativeEnum(Role)).default([Role.musician]),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneE164: z.string().regex(/^\+1\d{10}$/).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  roles: z.array(z.nativeEnum(Role)).optional(),
});
