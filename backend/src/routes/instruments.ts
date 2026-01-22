import { Router } from "express";
import * as instrumentsController from "../controllers/instrumentsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { validateRequest } from "../middleware/validateRequest";
import { mediumCache, noCache } from "../middleware/cacheControl";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Instruments routes
 * Base path: /instruments
 */

// Get all instruments (accessible by all authenticated users)
// Cache for 15 minutes since instrument list rarely changes
router.get("/", authMiddleware, mediumCache, instrumentsController.getAllInstruments);

// Get specific instrument
// Cache for 15 minutes since instrument data rarely changes
router.get("/:id", authMiddleware, mediumCache, instrumentsController.getInstrumentById);

// Admin only: Create new instrument
router.post(
  "/",
  authMiddleware,
  requireRole([Role.admin]),
  noCache,
  validateRequest("createInstrumentSchema"),
  instrumentsController.createInstrument
);

// Admin only: Update instrument
router.put(
  "/:id",
  authMiddleware,
  requireRole([Role.admin]),
  noCache,
  validateRequest("updateInstrumentSchema"),
  instrumentsController.updateInstrument
);

// Admin only: Delete instrument
router.delete(
  "/:id",
  authMiddleware,
  requireRole([Role.admin]),
  noCache,
  instrumentsController.deleteInstrument
);

export default router;