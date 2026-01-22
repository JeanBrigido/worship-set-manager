import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyToken } from "../utils/jwt";
import prisma from "../prisma";
import logger from "../utils/logger";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

export const authMiddleware = async (
  req: Request & { user?: JwtPayload },
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1]; // Expect "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: { message: "Missing token" } });
  }

  try {
    const payload = verifyToken<JwtPayload>(token);

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isActive: true }
    });

    if (!user) {
      return res.status(401).json({ error: { message: "User not found" } });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: { message: "Account is deactivated" } });
    }

    req.user = payload;
    next();
  } catch (err) {
    logger.debug({ err }, 'JWT verification failed');
    return res.status(401).json({ error: { message: "Invalid token" } });
  }
};
