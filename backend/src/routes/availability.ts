import { Router } from "express";
import * as availabilityController from "../controllers/availabilityController";
import { authMiddleware } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

/**
 * Base path: /availability
 */

// List availability for a user (self or Admin/Leader)
router.get("/user/:userId", authMiddleware, availabilityController.listAvailabilityForUser);

// Get single availability record
router.get("/:id", authMiddleware, availabilityController.getAvailability);

// Create availability (self only)
router.post(
  "/",
  authMiddleware,
  validateRequest("createAvailabilitySchema"),
  availabilityController.createAvailability
);

// Update availability (self only)
router.put(
  "/:id",
  authMiddleware,
  validateRequest("updateAvailabilitySchema"),
  availabilityController.updateAvailability
);

// Delete availability (self only)
router.delete("/:id", authMiddleware, availabilityController.deleteAvailability);

export default router;
