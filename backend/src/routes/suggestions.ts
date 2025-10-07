import { Router } from "express";
import * as suggestionsController from "../controllers/suggestionsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Suggestion routes
 * Base path: /suggestions
 */

// Get all suggestions for a slot
router.get("/slot/:slotId", authMiddleware, suggestionsController.listSuggestionsForSlot);

// Get all suggestions for a worship set (for worship set builder)
router.get("/by-worship-set/:worshipSetId", authMiddleware, suggestionsController.getSuggestionsByWorshipSet);

// Get one suggestion
router.get("/:id", authMiddleware, suggestionsController.getSuggestion);

// Add suggestion (musicians assigned to slot)
router.post("/", authMiddleware, requireRole([Role.musician, Role.leader, Role.admin]), suggestionsController.createSuggestion);

// Update suggestion
router.put("/:id", authMiddleware, requireRole([Role.musician, Role.leader, Role.admin]), suggestionsController.updateSuggestion);

// Delete suggestion
router.delete("/:id", authMiddleware, requireRole([Role.musician, Role.leader, Role.admin]), suggestionsController.deleteSuggestion);

// Approve suggestion (Worship Set Leader or Admin only - checked in controller)
router.put("/:id/approve", authMiddleware, suggestionsController.approveSuggestion);

// Reject suggestion (Worship Set Leader or Admin only - checked in controller)
router.put("/:id/reject", authMiddleware, suggestionsController.rejectSuggestion);

export default router;
