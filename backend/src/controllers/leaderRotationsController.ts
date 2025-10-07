import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /leader-rotations
 * List all leader rotations with user and service type details
 */
export const listRotations = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const rotations = await prisma.leaderRotation.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true, roles: true } },
        serviceType: { select: { id: true, name: true } }
      },
      orderBy: [
        { serviceTypeId: 'asc' },
        { rotationOrder: 'asc' }
      ]
    });

    res.json({ data: rotations });
  } catch (err) {
    console.error("Error listing rotations:", err);
    res.status(500).json({ error: { message: "Could not list leader rotations" } });
  }
};

/**
 * GET /leader-rotations/:id
 * Get a specific leader rotation by ID
 */
export const getRotation = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;

    const rotation = await prisma.leaderRotation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, roles: true } },
        serviceType: { select: { id: true, name: true } }
      }
    });

    if (!rotation) {
      return res.status(404).json({ error: { message: "Leader rotation not found" } });
    }

    res.json({ data: rotation });
  } catch (err) {
    console.error("Error fetching rotation:", err);
    res.status(500).json({ error: { message: "Could not fetch leader rotation" } });
  }
};

/**
 * POST /leader-rotations
 * Create a new leader rotation entry (Admin only)
 */
export const createRotation = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Admin access required" } });
    }

    const { userId, serviceTypeId, rotationOrder } = req.body;

    // Verify user has leader role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true }
    });

    if (!user || !user.roles.includes(Role.leader)) {
      return res.status(400).json({
        error: { message: "User must have leader role to be added to rotation" }
      });
    }

    const rotation = await prisma.leaderRotation.create({
      data: {
        userId,
        serviceTypeId,
        rotationOrder: rotationOrder || 1
      },
      include: {
        user: { select: { id: true, name: true, email: true, roles: true } },
        serviceType: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ data: rotation });
  } catch (err: any) {
    console.error("Error creating rotation:", err);

    if (err.code === 'P2002') {
      return res.status(400).json({
        error: { message: "Rotation order already exists for this service type" }
      });
    }

    res.status(500).json({ error: { message: "Could not create leader rotation" } });
  }
};

/**
 * PUT /leader-rotations/:id
 * Update a leader rotation (Admin only)
 */
export const updateRotation = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Admin access required" } });
    }

    const { id } = req.params;
    const { rotationOrder, isActive } = req.body;

    const rotation = await prisma.leaderRotation.update({
      where: { id },
      data: {
        rotationOrder,
        isActive
      },
      include: {
        user: { select: { id: true, name: true, email: true, roles: true } },
        serviceType: { select: { id: true, name: true } }
      }
    });

    res.json({ data: rotation });
  } catch (err: any) {
    console.error("Error updating rotation:", err);

    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: "Leader rotation not found" } });
    }

    if (err.code === 'P2002') {
      return res.status(400).json({
        error: { message: "Rotation order already exists for this service type" }
      });
    }

    res.status(500).json({ error: { message: "Could not update leader rotation" } });
  }
};

/**
 * DELETE /leader-rotations/:id
 * Soft delete a leader rotation (Admin only)
 */
export const deleteRotation = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Admin access required" } });
    }

    const { id } = req.params;

    // Soft delete by setting isActive to false
    await prisma.leaderRotation.update({
      where: { id },
      data: { isActive: false }
    });

    res.status(204).send();
  } catch (err: any) {
    console.error("Error deleting rotation:", err);

    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: "Leader rotation not found" } });
    }

    res.status(500).json({ error: { message: "Could not delete leader rotation" } });
  }
};

/**
 * GET /leader-rotations/next/:serviceTypeId
 * Get the next leader in rotation for a service type
 */
export const getNextLeader = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { serviceTypeId } = req.params;

    // Get all active rotations for this service type
    const rotations = await prisma.leaderRotation.findMany({
      where: {
        serviceTypeId,
        isActive: true
      },
      include: {
        user: { select: { id: true, name: true, email: true, roles: true } }
      },
      orderBy: { rotationOrder: 'asc' }
    });

    if (rotations.length === 0) {
      return res.status(404).json({
        error: { message: "No active leader rotation found for this service type" }
      });
    }

    // Get the most recent service for this service type with a leader assigned
    const lastService = await prisma.service.findFirst({
      where: {
        serviceTypeId,
        worshipSet: {
          leaderUserId: { not: null }
        }
      },
      include: {
        worshipSet: { select: { leaderUserId: true } }
      },
      orderBy: { serviceDate: 'desc' }
    });

    let nextRotation;

    if (!lastService || !lastService.worshipSet?.leaderUserId) {
      // No previous assignment, use first in rotation
      nextRotation = rotations[0];
    } else {
      // Find the current leader's rotation position
      const currentRotationIndex = rotations.findIndex(
        r => r.userId === lastService.worshipSet?.leaderUserId
      );

      if (currentRotationIndex === -1) {
        // Current leader not in rotation, use first
        nextRotation = rotations[0];
      } else {
        // Get next in rotation (circular)
        const nextIndex = (currentRotationIndex + 1) % rotations.length;
        nextRotation = rotations[nextIndex];
      }
    }

    res.json({ data: nextRotation });
  } catch (err) {
    console.error("Error getting next leader:", err);
    res.status(500).json({ error: { message: "Could not determine next leader" } });
  }
};

/**
 * GET /leader-rotations/by-service-type/:serviceTypeId
 * Get all rotations for a specific service type
 */
export const getRotationsByServiceType = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { serviceTypeId } = req.params;

    const rotations = await prisma.leaderRotation.findMany({
      where: {
        serviceTypeId,
        isActive: true
      },
      include: {
        user: { select: { id: true, name: true, email: true, roles: true } },
        serviceType: { select: { id: true, name: true } }
      },
      orderBy: { rotationOrder: 'asc' }
    });

    res.json({ data: rotations });
  } catch (err) {
    console.error("Error fetching rotations by service type:", err);
    res.status(500).json({ error: { message: "Could not fetch leader rotations" } });
  }
};
