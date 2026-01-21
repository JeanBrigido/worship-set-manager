import { Router } from "express";
import multer from "multer";
import * as chordSheetsController from "../controllers/chordSheetsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Get chord sheet for a song version (any authenticated user)
router.get(
  "/song-versions/:id/chord-sheet",
  authMiddleware,
  chordSheetsController.getChordSheet
);

// Create/update chord sheet (admin/leader only)
router.put(
  "/song-versions/:id/chord-sheet",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  validateRequest("upsertChordSheetSchema"),
  chordSheetsController.upsertChordSheet
);

// Delete chord sheet (admin/leader only)
router.delete(
  "/song-versions/:id/chord-sheet",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  chordSheetsController.deleteChordSheet
);

// Upload chord sheet file (admin/leader only)
router.post(
  "/song-versions/:id/chord-sheet/upload",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  upload.single("file"),
  chordSheetsController.uploadChordSheetFile
);

// Get transposed chord sheet for a set song (any authenticated user)
router.get(
  "/set-songs/:id/chord-sheet",
  authMiddleware,
  chordSheetsController.getTransposedChordSheet
);

export default router;
