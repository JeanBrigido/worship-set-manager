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
  createAssignmentSchema,
  updateAssignmentSchema,
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
  createAssignmentSchema,
  updateAssignmentSchema,
};

export const validateRequest = (schemaName: keyof typeof schemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schemas[schemaName].parse(req.body);
      next();
    } catch (err: any) {
      return res.status(400).json({
        error: "Validation failed",
        details: err.errors,
      });
    }
  };
};
