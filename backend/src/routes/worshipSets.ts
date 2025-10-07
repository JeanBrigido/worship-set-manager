import { Router } from "express";
import * as worshipSetsController from "../controllers/worshipSetsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { requireWorshipSetLeader } from "../middleware/worshipSetLeaderAuth";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Base path: /worshipSets
 */

// Get worship set for a service
router.get("/:serviceId", authMiddleware, worshipSetsController.getWorshipSet);

// Create a worship set for a service (Admin only)
router.post(
  "/",
  authMiddleware,
  requireRole([Role.admin]),
  validateRequest("createWorshipSetSchema"),
  worshipSetsController.createWorshipSet
);

// Update worship set (Admin or Worship Set Leader only)
router.put(
  "/:id",
  authMiddleware,
  requireWorshipSetLeader,
  validateRequest("updateWorshipSetSchema"),
  worshipSetsController.updateWorshipSet
);

// Delete worship set (Admin only)
router.delete("/:id", authMiddleware, requireRole([Role.admin]), worshipSetsController.deleteWorshipSet);

// Assign leader to worship set (Admin only)
router.put("/:id/assign-leader", authMiddleware, requireRole([Role.admin]), worshipSetsController.assignLeader);

// Get suggested leader for worship set based on rotation
router.get("/:id/suggested-leader", authMiddleware, worshipSetsController.getSuggestedLeader);

export default router;
