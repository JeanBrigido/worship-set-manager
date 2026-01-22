import { Router } from "express";
import * as serviceTypesController from "../controllers/serviceTypesController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { mediumCache, noCache } from "../middleware/cacheControl";
import { Role } from "@prisma/client";

const router = Router();

/**
 * ServiceType routes
 * Base path: /serviceTypes
 */

// List all service types (any role can view)
// Cache for 15 minutes since service types rarely change
router.get("/", authMiddleware, mediumCache, serviceTypesController.listServiceTypes);

// Get one service type
// Cache for 15 minutes since service types rarely change
router.get("/:id", authMiddleware, mediumCache, serviceTypesController.getServiceType);

// Admin only: create
router.post("/", authMiddleware, requireRole([Role.admin]), noCache, serviceTypesController.createServiceType);

// Admin only: update
router.put("/:id", authMiddleware, requireRole([Role.admin]), noCache, serviceTypesController.updateServiceType);

// Admin only: delete
router.delete("/:id", authMiddleware, requireRole([Role.admin]), noCache, serviceTypesController.deleteServiceType);

// Admin only: generate services for the year
router.post("/:id/generate-services", authMiddleware, requireRole([Role.admin]), noCache, serviceTypesController.generateServices);

export default router;
