import { Request, Response } from "express";
import prisma from "../prisma";
import { Role, Channel } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /notifications/user/:userId
 */
export const listForUser = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { userId } = req.params;

    // Allow self or Admin/Leader
    if (req.user?.userId !== userId && !req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const logs = await prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { sentAt: "desc" },
    });

    res.json({ data: logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not list notifications" } });
  }
};

/**
 * GET /notifications/:id
 */
export const getNotification = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;

    const log = await prisma.notificationLog.findUnique({ where: { id } });
    if (!log) return res.status(404).json({ error: { message: "Notification not found" } });

    if (log.userId !== req.user?.userId && !req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    res.json({ data: log });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch notification" } });
  }
};

/**
 * POST /notifications
 */
export const createNotification = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { userId, channel, templateKey, payloadJson, status } = req.body;

    const log = await prisma.notificationLog.create({
      data: {
        userId,
        channel: channel as Channel,
        templateKey,
        payloadJson,
        sentAt: new Date(),
        status,
      },
    });

    res.status(201).json({ data: log });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not create notification" } });
  }
};
