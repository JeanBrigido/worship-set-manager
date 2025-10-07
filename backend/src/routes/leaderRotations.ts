import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { validateUuid } from "../middleware/validateUuid";
import {
  listRotations,
  getRotation,
  createRotation,
  updateRotation,
  deleteRotation,
  getNextLeader,
  getRotationsByServiceType
} from "../controllers/leaderRotationsController";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /leader-rotations - List all rotations
router.get("/", listRotations);

// GET /leader-rotations/next/:serviceTypeId - Get next leader for service type
router.get("/next/:serviceTypeId", validateUuid("serviceTypeId"), getNextLeader);

// GET /leader-rotations/by-service-type/:serviceTypeId - Get rotations by service type
router.get("/by-service-type/:serviceTypeId", validateUuid("serviceTypeId"), getRotationsByServiceType);

// GET /leader-rotations/:id - Get specific rotation
router.get("/:id", validateUuid("id"), getRotation);

// POST /leader-rotations - Create rotation (Admin only)
router.post("/", requireRole(["admin"]), createRotation);

// PUT /leader-rotations/:id - Update rotation (Admin only)
router.put("/:id", validateUuid("id"), requireRole(["admin"]), updateRotation);

// DELETE /leader-rotations/:id - Delete rotation (Admin only)
router.delete("/:id", validateUuid("id"), requireRole(["admin"]), deleteRotation);

export default router;
