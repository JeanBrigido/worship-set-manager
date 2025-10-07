import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * Middleware to require one or more roles.
 * Usage: router.get("/", authMiddleware, requireRole([Role.admin]), handler)
 */
export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }

    next();
  };
};
