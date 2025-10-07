import { Router } from "express";
import * as suggestionSlotsController from "../controllers/suggestionSlotsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Base path: /suggestionSlots
 */

// Get current user's suggestion assignments
router.get("/my-assignments", authMiddleware, suggestionSlotsController.getMyAssignments);

// List slots for a worship set
router.get("/set/:setId", authMiddleware, suggestionSlotsController.listSlotsForSet);

// Get a single suggestion slot
router.get("/:id", authMiddleware, suggestionSlotsController.getSlot);

// Create slot (Admin/Leader only)
router.post(
  "/",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  validateRequest("createSuggestionSlotSchema"),
  suggestionSlotsController.createSlot
);

// Update slot (Admin/Leader only)
router.put(
  "/:id",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  validateRequest("updateSuggestionSlotSchema"),
  suggestionSlotsController.updateSlot
);

// Delete slot (Admin/Leader only)
router.delete("/:id", authMiddleware, requireRole([Role.admin, Role.leader]), suggestionSlotsController.deleteSlot);

// Assign user to suggestion slot (Admin/Leader only)
router.put("/:id/assign-user", authMiddleware, requireRole([Role.admin, Role.leader]), suggestionSlotsController.assignUser);

export default router;
