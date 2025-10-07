import { Router } from "express";
import * as serviceTypesController from "../controllers/serviceTypesController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { Role } from "@prisma/client";

const router = Router();

/**
 * ServiceType routes
 * Base path: /serviceTypes
 */

// List all service types (any role can view)
router.get("/", authMiddleware, serviceTypesController.listServiceTypes);

// Get one service type
router.get("/:id", authMiddleware, serviceTypesController.getServiceType);

// Admin only: create
router.post("/", authMiddleware, requireRole([Role.admin]), serviceTypesController.createServiceType);

// Admin only: update
router.put("/:id", authMiddleware, requireRole([Role.admin]), serviceTypesController.updateServiceType);

// Admin only: delete
router.delete("/:id", authMiddleware, requireRole([Role.admin]), serviceTypesController.deleteServiceType);

export default router;
