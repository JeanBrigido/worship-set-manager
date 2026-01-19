import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /availability/user/:userId
 */
export const listAvailabilityForUser = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { userId } = req.params;

    // Allow self or Admin/Leader
    if (req.user?.userId !== userId && !req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const records = await prisma.availability.findMany({
      where: { userId },
      orderBy: { start: "asc" },
    });

    res.json({ data: records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not list availability" } });
  }
};

/**
 * GET /availability/:id
 */
export const getAvailability = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;

    const record = await prisma.availability.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ error: { message: "Availability not found" } });

    if (record.userId !== req.user?.userId && !req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    res.json({ data: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch availability" } });
  }
};

/**
 * POST /availability
 */
export const createAvailability = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { start, end, notes } = req.body;

    const record = await prisma.availability.create({
      data: {
        userId: req.user!.userId,
        start: new Date(start),
        end: new Date(end),
        notes,
      },
    });

    res.status(201).json({ data: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not create availability" } });
  }
};

/**
 * PUT /availability/:id
 */
export const updateAvailability = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const { start, end, notes } = req.body;

    const record = await prisma.availability.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ error: { message: "Availability not found" } });

    if (record.userId !== req.user?.userId) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const updated = await prisma.availability.update({
      where: { id },
      data: {
        start: start ? new Date(start) : undefined,
        end: end ? new Date(end) : undefined,
        notes,
      },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not update availability" } });
  }
};

/**
 * DELETE /availability/:id
 */
export const deleteAvailability = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;

    const record = await prisma.availability.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ error: { message: "Availability not found" } });

    if (record.userId !== req.user?.userId) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    await prisma.availability.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not delete availability" } });
  }
};
