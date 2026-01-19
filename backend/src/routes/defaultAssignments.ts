import { Router } from "express";
import * as defaultAssignmentsController from "../controllers/defaultAssignmentsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Default Assignments routes
 * Base path: /default-assignments
 */

// List all default assignments (accessible by all authenticated users)
router.get("/", authMiddleware, defaultAssignmentsController.listDefaultAssignments);

// Get specific default assignment
router.get("/:id", authMiddleware, defaultAssignmentsController.getDefaultAssignment);

// Admin only: Create new default assignment
router.post(
  "/",
  authMiddleware,
  requireRole([Role.admin]),
  defaultAssignmentsController.createDefaultAssignment
);

// Admin only: Update default assignment
router.put(
  "/:id",
  authMiddleware,
  requireRole([Role.admin]),
  defaultAssignmentsController.updateDefaultAssignment
);

// Admin only: Delete default assignment
router.delete(
  "/:id",
  authMiddleware,
  requireRole([Role.admin]),
  defaultAssignmentsController.deleteDefaultAssignment
);

export default router;
