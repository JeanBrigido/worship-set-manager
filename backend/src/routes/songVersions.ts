import { Router } from "express";
import * as songVersionsController from "../controllers/songVersionsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Base path: /songVersions
 */

// List versions for a song
router.get("/song/:songId", authMiddleware, songVersionsController.listVersionsForSong);

// Get a single version
router.get("/:id", authMiddleware, songVersionsController.getVersion);

// Create a new version (Admin/Leader only)
router.post(
  "/",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  validateRequest("createSongVersionSchema"),
  songVersionsController.createVersion
);

// Update version (Admin/Leader only)
router.put(
  "/:id",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  validateRequest("updateSongVersionSchema"),
  songVersionsController.updateVersion
);

// Delete version (Admin only)
router.delete("/:id", authMiddleware, requireRole([Role.admin]), songVersionsController.deleteVersion);

export default router;
