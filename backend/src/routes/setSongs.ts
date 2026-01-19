import { Router } from "express";
import * as setSongsController from "../controllers/setSongsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Base path: /setSongs
 */

// List songs for a worship set
router.get("/set/:setId", authMiddleware, setSongsController.listSetSongs);

// Get a single set song
router.get("/:id", authMiddleware, setSongsController.getSetSong);

// Add a song to a worship set (Admin/Leader only)
router.post(
  "/",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  validateRequest("createSetSongSchema"),
  setSongsController.createSetSong
);

// Update set song (Admin/Leader only)
router.put(
  "/:id",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  validateRequest("updateSetSongSchema"),
  setSongsController.updateSetSong
);

// Remove a song from a worship set (Admin/Leader only)
router.delete("/:id", authMiddleware, requireRole([Role.admin, Role.leader]), setSongsController.deleteSetSong);

// Reorder songs in a worship set (Admin/Leader only)
router.put("/set/:setId/reorder", authMiddleware, requireRole([Role.admin, Role.leader]), setSongsController.reorderSetSongs);

export default router;
