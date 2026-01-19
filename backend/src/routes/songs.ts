import { Router } from "express";
import * as songsController from "../controllers/songsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { validateRequest } from "../middleware/validateRequest";
import { validateUuid } from "../middleware/validateUuid";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Song routes
 * Base path: /songs
 */

// List all songs
router.get("/", authMiddleware, songsController.listSongs);

// Get one song
router.get("/:id", authMiddleware, validateUuid('id'), songsController.getSong);

// Any role: create new song
router.post(
  "/",
  authMiddleware,
  requireRole([Role.admin, Role.leader, Role.musician]),
  validateRequest("createSongSchema"),
  songsController.createSong
);

// Any role: update a song
router.put(
  "/:id",
  authMiddleware,
  validateUuid('id'),
  requireRole([Role.admin, Role.leader, Role.musician]),
  validateRequest("updateSongSchema"),
  songsController.updateSong
);

// Admin only: delete song
router.delete("/:id", authMiddleware, validateUuid('id'), requireRole([Role.admin]), songsController.deleteSong);

export default router;
