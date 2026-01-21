import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * Helper function to recalculate leader assignments for all future services
 * of a given service type based on the current leader rotation.
 */
async function recalculateLeaderAssignments(serviceTypeId: string): Promise<void> {
  // Get all active rotations for this service type ordered by rotationOrder
  const rotations = await prisma.leaderRotation.findMany({
    where: {
      serviceTypeId,
      isActive: true
    },
    orderBy: { rotationOrder: 'asc' }
  });

  if (rotations.length === 0) {
    // No active rotations - clear all leader assignments for future services
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureServices = await prisma.service.findMany({
      where: {
        serviceTypeId,
        serviceDate: { gte: today }
      },
      include: { worshipSet: true },
      orderBy: { serviceDate: 'asc' }
    });

    // Clear leader assignments for future services
    for (const service of futureServices) {
      if (service.worshipSet) {
        await prisma.worshipSet.update({
          where: { id: service.worshipSet.id },
          data: { leaderUserId: null }
        });
      }
    }
    return;
  }

  // Get all future services for this service type ordered by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureServices = await prisma.service.findMany({
    where: {
      serviceTypeId,
      serviceDate: { gte: today }
    },
    include: { worshipSet: true },
    orderBy: { serviceDate: 'asc' }
  });

  if (futureServices.length === 0) {
    return; // No future services to update
  }

  // Assign leaders based on rotation order (cycling through rotations)
  for (let i = 0; i < futureServices.length; i++) {
    const service = futureServices[i];
    const rotationIndex = i % rotations.length;
    const leaderUserId = rotations[rotationIndex].userId;

    if (service.worshipSet) {
      await prisma.worshipSet.update({
        where: { id: service.worshipSet.id },
        data: { leaderUserId }
      });
    }
  }
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

    // Recalculate leader assignments for future services
    await recalculateLeaderAssignments(serviceTypeId);

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

    // Recalculate leader assignments for future services
    await recalculateLeaderAssignments(rotation.serviceTypeId);

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
    const rotation = await prisma.leaderRotation.update({
      where: { id },
      data: { isActive: false }
    });

    // Recalculate leader assignments for future services
    await recalculateLeaderAssignments(rotation.serviceTypeId);

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

/**
 * PUT /leader-rotations/reorder
 * Reorder rotations for a service type (Admin only)
 * Expects: { serviceTypeId: string, rotationIds: string[] } where rotationIds is in the new order
 */
export const reorderRotations = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Admin access required" } });
    }

    const { serviceTypeId, rotationIds } = req.body as { serviceTypeId: string; rotationIds: string[] };

    if (!serviceTypeId || !rotationIds || !Array.isArray(rotationIds)) {
      return res.status(400).json({ error: { message: "serviceTypeId and rotationIds array are required" } });
    }

    // Two-phase update to avoid unique constraint conflicts on [serviceTypeId, rotationOrder]
    // Phase 1: Set all to temporary negative values (can run in parallel since negatives don't conflict)
    // Phase 2: Set to final positive values (can run in parallel since we cleared all positives)
    await prisma.$transaction(async (tx) => {
      // Phase 1: Set to temporary negative values (parallel)
      await Promise.all(
        rotationIds.map((id, index) =>
          tx.leaderRotation.update({
            where: { id },
            data: { rotationOrder: -(index + 1) }
          })
        )
      );

      // Phase 2: Set to final positive values (parallel)
      await Promise.all(
        rotationIds.map((id, index) =>
          tx.leaderRotation.update({
            where: { id },
            data: { rotationOrder: index + 1 }
          })
        )
      );
    });

    // Recalculate leader assignments for future services
    await recalculateLeaderAssignments(serviceTypeId);

    // Fetch and return the updated rotations
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
    console.error("Error reordering rotations:", err);
    res.status(500).json({ error: { message: "Could not reorder leader rotations" } });
  }
};
