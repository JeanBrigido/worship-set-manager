import { Router } from "express";
import * as notificationsController from "../controllers/notificationsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { validateRequest } from "../middleware/validateRequest";
import { Role } from "@prisma/client";

const router = Router();

/**
 * Base path: /notifications
 */

// List notifications for a user (self or Admin/Leader)
router.get("/user/:userId", authMiddleware, notificationsController.listForUser);

// Get a single notification
router.get("/:id", authMiddleware, notificationsController.getNotification);

// Create a notification log entry (Admin/Leader only — system use)
router.post(
  "/",
  authMiddleware,
  requireRole([Role.admin, Role.leader]),
  validateRequest("createNotificationSchema"),
  notificationsController.createNotification
);

export default router;
