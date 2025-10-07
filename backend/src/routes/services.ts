import { Router } from "express";
import * as servicesController from "../controllers/servicesController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { validateRequest } from "../middleware/validateRequest";
import { validateUuid } from "../middleware/validateUuid";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Base path: /services
 */

// List all services (any logged-in user)
router.get("/", authMiddleware, servicesController.listServices);

// Get a single service
router.get("/:id", authMiddleware, validateUuid('id'), servicesController.getService);

// Create a new service (Admin/Leader only)
router.post(
  "/",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  validateRequest("createServiceSchema"),
  servicesController.createService
);

// Update a service (Admin/Leader only)
router.put(
  "/:id",
  authMiddleware,
  validateUuid('id'),
  requireRole([Role.admin, Role.leader]),
  validateRequest("updateServiceSchema"),
  servicesController.updateService
);

// Delete a service (Admin only)
router.delete("/:id", authMiddleware, validateUuid('id'), requireRole([Role.admin]), servicesController.deleteService);

// Get assignments for a service (any logged-in user)
router.get("/:id/assignments", authMiddleware, validateUuid('id'), servicesController.getServiceAssignments);

// Update assignments for a service (Admin/Leader only)
router.put(
  "/:id/assignments",
  authMiddleware,
  validateUuid('id'),
  requireRole([Role.admin, Role.leader]),
  validateRequest("updateServiceAssignmentsSchema"),
  servicesController.updateServiceAssignments
);

export default router;
