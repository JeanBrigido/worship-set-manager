import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /default-assignments
 * List all default assignments, optionally filtered by serviceTypeId
 */
export const listDefaultAssignments = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { serviceTypeId } = req.query;

    const where = serviceTypeId ? { serviceTypeId: serviceTypeId as string } : {};

    const assignments = await prisma.defaultAssignment.findMany({
      where,
      include: {
        serviceType: true,
        instrument: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [
        { serviceTypeId: 'asc' },
        { instrumentId: 'asc' },
      ],
    });

    res.json({ data: assignments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch default assignments" } });
  }
};

/**
 * GET /default-assignments/:id
 */
export const getDefaultAssignment = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.defaultAssignment.findUnique({
      where: { id },
      include: {
        serviceType: true,
        instrument: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: { message: "Default assignment not found" } });
    }

    res.json({ data: assignment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch default assignment" } });
  }
};

/**
 * POST /default-assignments
 * Admin only: Create a default assignment
 */
export const createDefaultAssignment = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { serviceTypeId, instrumentId, userId } = req.body;

    // Check if assignment already exists (unique constraint)
    const existing = await prisma.defaultAssignment.findUnique({
      where: {
        serviceTypeId_instrumentId: { serviceTypeId, instrumentId },
      },
    });

    if (existing) {
      return res.status(400).json({
        error: "A default assignment already exists for this service type and instrument",
      });
    }

    const assignment = await prisma.defaultAssignment.create({
      data: {
        serviceTypeId,
        instrumentId,
        userId,
      },
      include: {
        serviceType: true,
        instrument: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ data: assignment });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2002") {
      return res.status(400).json({
        error: "A default assignment already exists for this service type and instrument",
      });
    }
    res.status(500).json({ error: { message: "Could not create default assignment" } });
  }
};

/**
 * PUT /default-assignments/:id
 * Admin only: Update a default assignment (change the user)
 */
export const updateDefaultAssignment = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;
    const { userId } = req.body;

    const assignment = await prisma.defaultAssignment.update({
      where: { id },
      data: { userId },
      include: {
        serviceType: true,
        instrument: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ data: assignment });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: { message: "Default assignment not found" } });
    }
    res.status(500).json({ error: { message: "Could not update default assignment" } });
  }
};

/**
 * DELETE /default-assignments/:id
 * Admin only: Delete a default assignment
 */
export const deleteDefaultAssignment = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;

    await prisma.defaultAssignment.delete({ where: { id } });

    res.status(204).send();
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: { message: "Default assignment not found" } });
    }
    res.status(500).json({ error: { message: "Could not delete default assignment" } });
  }
};
