import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /users/:userId/instruments
 * Get all instruments a user can play
 */
export const getUserInstruments = async (
  req: Request & { user?: JwtPayload },
  res: Response
) => {
  try {
    const { id: userId } = req.params;

    // Users can view their own instruments, admins can view anyone's
    const isOwnProfile = req.user?.userId === userId;
    const isAdmin = req.user?.roles?.includes(Role.admin);

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        error: { message: "You can only view your own instruments" },
      });
    }

    const userInstruments = await prisma.userInstrument.findMany({
      where: { userId },
      include: {
        instrument: {
          select: {
            id: true,
            code: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        instrument: {
          displayName: "asc",
        },
      },
    });

    // Return just the instruments with their relationship data
    const instruments = userInstruments.map((ui) => ({
      id: ui.instrument.id,
      code: ui.instrument.code,
      displayName: ui.instrument.displayName,
      isPrimary: ui.isPrimary,
      proficiencyLevel: ui.proficiencyLevel,
    }));

    res.json({ data: instruments });
  } catch (err) {
    console.error("Error fetching user instruments:", err);
    res.status(500).json({
      error: { message: "Could not fetch user instruments" },
    });
  }
};

/**
 * PUT /users/:userId/instruments
 * Update instruments a user can play
 * Body: { instrumentIds: string[] }
 */
export const updateUserInstruments = async (
  req: Request & { user?: JwtPayload },
  res: Response
) => {
  try {
    const { id: userId } = req.params;
    const { instrumentIds } = req.body;

    // Users can update their own instruments, admins can update anyone's
    const isOwnProfile = req.user?.userId === userId;
    const isAdmin = req.user?.roles?.includes(Role.admin);

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        error: { message: "You can only update your own instruments" },
      });
    }

    if (!Array.isArray(instrumentIds)) {
      return res.status(400).json({
        error: { message: "instrumentIds must be an array" },
      });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        error: { message: "User not found" },
      });
    }

    // Verify all instrument IDs exist
    if (instrumentIds.length > 0) {
      const existingInstruments = await prisma.instrument.findMany({
        where: { id: { in: instrumentIds } },
        select: { id: true },
      });

      if (existingInstruments.length !== instrumentIds.length) {
        return res.status(400).json({
          error: { message: "One or more instrument IDs are invalid" },
        });
      }
    }

    // Use a transaction to delete existing and create new
    await prisma.$transaction(async (tx) => {
      // Delete all existing user instruments
      await tx.userInstrument.deleteMany({
        where: { userId },
      });

      // Create new user instruments
      if (instrumentIds.length > 0) {
        await tx.userInstrument.createMany({
          data: instrumentIds.map((instrumentId: string) => ({
            userId,
            instrumentId,
          })),
        });
      }
    });

    // Fetch and return the updated instruments
    const updatedUserInstruments = await prisma.userInstrument.findMany({
      where: { userId },
      include: {
        instrument: {
          select: {
            id: true,
            code: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        instrument: {
          displayName: "asc",
        },
      },
    });

    const instruments = updatedUserInstruments.map((ui) => ({
      id: ui.instrument.id,
      code: ui.instrument.code,
      displayName: ui.instrument.displayName,
      isPrimary: ui.isPrimary,
      proficiencyLevel: ui.proficiencyLevel,
    }));

    res.json({ data: instruments });
  } catch (err) {
    console.error("Error updating user instruments:", err);
    res.status(500).json({
      error: { message: "Could not update user instruments" },
    });
  }
};
