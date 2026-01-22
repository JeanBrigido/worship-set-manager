// src/middleware/validateRequest.ts
import { Request, Response, NextFunction } from "express";
import {
  signupSchema,
  loginSchema,
  createUserSchema,
  updateUserSchema,
  toggleUserActiveSchema,
  updateUserRolesSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createServiceSchema,
  updateServiceSchema,
  updateServiceAssignmentsSchema,
  createSetSongSchema,
  updateSetSongSchema,
  createSuggestionSlotSchema,
  updateSuggestionSlotSchema,
  createInstrumentSchema,
  updateInstrumentSchema,
  createSongSchema,
  updateSongSchema,
  createSongVersionSchema,
  updateSongVersionSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
  upsertChordSheetSchema,
  createAvailabilitySchema,
  updateAvailabilitySchema,
} from "../validation";

const schemas: Record<string, any> = {
  signupSchema,
  loginSchema,
  createUserSchema,
  updateUserSchema,
  toggleUserActiveSchema,
  updateUserRolesSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createServiceSchema,
  updateServiceSchema,
  updateServiceAssignmentsSchema,
  createSetSongSchema,
  updateSetSongSchema,
  createSuggestionSlotSchema,
  updateSuggestionSlotSchema,
  createInstrumentSchema,
  updateInstrumentSchema,
  createSongSchema,
  updateSongSchema,
  createSongVersionSchema,
  updateSongVersionSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
  upsertChordSheetSchema,
  createAvailabilitySchema,
  updateAvailabilitySchema,
};

export const validateRequest = (schemaName: keyof typeof schemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schemas[schemaName].parse(req.body);
      next();
    } catch (err: any) {
      // Sanitize Zod errors to only expose field names and user-friendly messages
      // Don't expose internal schema details
      const sanitizedErrors = err.errors?.map((e: any) => ({
        field: e.path?.join('.') || 'unknown',
        message: e.message || 'Invalid value',
      })) || [];

      return res.status(400).json({
        error: { message: "Validation failed" },
        details: sanitizedErrors,
      });
    }
  };
};
