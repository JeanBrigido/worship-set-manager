import { Router } from "express";
import * as instrumentsController from "../controllers/instrumentsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Instruments routes
 * Base path: /instruments
 */

// Get all instruments (accessible by all authenticated users)
router.get("/", authMiddleware, instrumentsController.getAllInstruments);

// Get specific instrument
router.get("/:id", authMiddleware, instrumentsController.getInstrumentById);

// Admin only: Create new instrument
router.post(
  "/",
  authMiddleware,
  requireRole([Role.admin]),
  validateRequest("createInstrumentSchema"),
  instrumentsController.createInstrument
);

// Admin only: Update instrument
router.put(
  "/:id",
  authMiddleware,
  requireRole([Role.admin]),
  validateRequest("updateInstrumentSchema"),
  instrumentsController.updateInstrument
);

// Admin only: Delete instrument
router.delete(
  "/:id",
  authMiddleware,
  requireRole([Role.admin]),
  instrumentsController.deleteInstrument
);

export default router;