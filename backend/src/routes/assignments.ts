import { Router } from "express";
import * as assignmentsController from "../controllers/assignmentsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { requireAssignmentWorshipSetLeader } from "../middleware/worshipSetLeaderAuth";
import { validateRequest } from "../middleware/validateRequest";
import { validateUuid } from "../middleware/validateUuid";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Base path: /assignments
 */

// List all assignments (for the authenticated user or all if admin/worship set leader)
router.get("/", authMiddleware, assignmentsController.listAssignments);

// List assignments for a set
router.get("/set/:setId", authMiddleware, validateUuid('setId'), assignmentsController.listAssignmentsForSet);

// Get a single assignment
router.get("/:id", authMiddleware, validateUuid('id'), assignmentsController.getAssignment);

// Create assignment (checked in controller for Admin or Worship Set Leader)
router.post(
  "/",
  authMiddleware,
  validateRequest("createAssignmentSchema"),
  assignmentsController.createAssignment
);

// Update assignment (Self/Admin/Worship Set Leader - controller handles logic)
router.put(
  "/:id",
  authMiddleware,
  validateUuid('id'),
  validateRequest("updateAssignmentSchema"),
  assignmentsController.updateAssignment
);

// Delete assignment (Admin or Worship Set Leader only)
router.delete("/:id", authMiddleware, validateUuid('id'), requireAssignmentWorshipSetLeader, assignmentsController.deleteAssignment);

export default router;
