import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as usersController from "../controllers/usersController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { validateRequest } from "../middleware/validateRequest";
import { validateUuid } from "../middleware/validateUuid";
import { Role } from "@prisma/client";

const router = Router();

/**
 * User routes
 * Base path: /users
 */

// Rate limiters for authentication endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: { error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: { error: "Too many signup attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public signup (self-register)
router.post(
  "/signup",
  signupLimiter,
  validateRequest("signupSchema"),
  usersController.signup
);

// Public login
router.post("/login", loginLimiter, usersController.login);

// Get current logged-in user
router.get("/me", authMiddleware, usersController.getMe);

// Admin only: list all users
router.get("/", authMiddleware, requireRole([Role.admin]), usersController.listUsers);

// Get user profile (Self/Admin - controller handles authorization logic)
router.get("/:id", authMiddleware, validateUuid('id'), usersController.getUser);

// Admin only: create a new user
router.post(
  "/",
  authMiddleware,
  requireRole([Role.admin]),
  validateRequest("createUserSchema"),
  usersController.createUser
);

// Update user (Self/Admin - controller handles authorization logic)
router.put(
  "/:id",
  authMiddleware,
  validateUuid('id'),
  validateRequest("updateUserSchema"),
  usersController.updateUser
);

// Admin only: delete (deactivate) a user
router.delete(
  "/:id",
  authMiddleware,
  validateUuid('id'),
  requireRole([Role.admin]),
  usersController.deleteUser
);

export default router;
