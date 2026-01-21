import { Router } from "express";
import * as singerSongKeysController from "../controllers/singerSongKeysController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { validateRequest } from "../middleware/validateRequest";
import { validateUuid } from "../middleware/validateUuid";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Base path: /api/singer-song-keys
 */

// List singer song keys (with optional filters)
router.get("/", authMiddleware, singerSongKeysController.listSingerSongKeys);

// Get key suggestions for singer + song (must be before /:id route)
router.get("/suggestions", authMiddleware, singerSongKeysController.getSuggestions);

// Get single singer song key
router.get("/:id", authMiddleware, validateUuid("id"), singerSongKeysController.getSingerSongKey);

// Create singer song key (Admin/Leader)
router.post(
  "/",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  validateRequest("createSingerSongKeySchema"),
  singerSongKeysController.createSingerSongKey
);

// Update singer song key (Admin/Leader)
router.put(
  "/:id",
  authMiddleware,
  validateUuid("id"),
  requireRole([Role.admin, Role.leader]),
  validateRequest("updateSingerSongKeySchema"),
  singerSongKeysController.updateSingerSongKey
);

// Delete singer song key (Admin/Leader)
router.delete(
  "/:id",
  authMiddleware,
  validateUuid("id"),
  requireRole([Role.admin, Role.leader]),
  singerSongKeysController.deleteSingerSongKey
);

export default router;
