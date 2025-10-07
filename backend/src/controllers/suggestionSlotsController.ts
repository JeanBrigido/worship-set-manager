import { Request, Response } from "express";
import prisma from "../prisma";
import { Role, SlotStatus } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /suggestionSlots/set/:setId
 */
export const listSlotsForSet = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { setId } = req.params;
    const slots = await prisma.suggestionSlot.findMany({
      where: { setId },
      include: { assignedUser: true, suggestions: true },
    });
    res.json({ data: slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not list slots" });
  }
};

/**
 * GET /suggestionSlots/:id
 */
export const getSlot = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const slot = await prisma.suggestionSlot.findUnique({
      where: { id },
      include: { assignedUser: true, suggestions: true },
    });
    if (!slot) return res.status(404).json({ error: "Slot not found" });
    res.json({ data: slot });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch slot" });
  }
};

/**
 * POST /suggestionSlots
 */
export const createSlot = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { setId, assignedUserId, minSongs, maxSongs, dueAt } = req.body;

    const slot = await prisma.suggestionSlot.create({
      data: {
        setId,
        assignedUserId,
        minSongs,
        maxSongs,
        dueAt: new Date(dueAt),
      },
    });

    res.status(201).json({ data: slot });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create slot" });
  }
};

/**
 * PUT /suggestionSlots/:id
 */
export const updateSlot = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;
    const { minSongs, maxSongs, dueAt, status } = req.body;

    const updated = await prisma.suggestionSlot.update({
      where: { id },
      data: {
        minSongs,
        maxSongs,
        dueAt: dueAt ? new Date(dueAt) : undefined,
        status: status as SlotStatus,
      },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update slot" });
  }
};

/**
 * DELETE /suggestionSlots/:id
 */
export const deleteSlot = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;

    await prisma.suggestionSlot.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete slot" });
  }
};

/**
 * PUT /suggestionSlots/:id/assign-user
 * Assign a user to a suggestion slot (Admin/Leader only)
 */
export const assignUser = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Admin or Leader access required" } });
    }

    const { id } = req.params;
    const { assignedUserId } = req.body;

    // Verify the user exists
    const user = await prisma.user.findUnique({
      where: { id: assignedUserId },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return res.status(400).json({
        error: { message: "User not found" }
      });
    }

    const updated = await prisma.suggestionSlot.update({
      where: { id },
      data: { assignedUserId },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        worshipSet: { include: { service: true } }
      }
    });

    res.json({ data: updated });
  } catch (err: any) {
    console.error("Error assigning user:", err);

    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: "Suggestion slot not found" } });
    }

    res.status(500).json({ error: { message: "Could not assign user to suggestion slot" } });
  }
};

/**
 * GET /suggestionSlots/my-assignments
 * Get all suggestion slot assignments for the current user
 */
export const getMyAssignments = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: { message: "Authentication required" } });
    }

    const slots = await prisma.suggestionSlot.findMany({
      where: {
        assignedUserId: req.user.userId,
      },
      include: {
        worshipSet: {
          include: {
            service: {
              include: {
                serviceType: true
              }
            }
          }
        },
        suggestions: {
          include: {
            song: {
              include: {
                versions: true
              }
            }
          }
        }
      },
      orderBy: {
        dueAt: 'asc'
      }
    });

    // Calculate status for each slot
    const slotsWithStatus = slots.map(slot => {
      const now = new Date();
      const dueDate = new Date(slot.dueAt);
      const isOverdue = now > dueDate && slot.status === SlotStatus.pending;
      const suggestionCount = slot.suggestions.length;

      return {
        ...slot,
        isOverdue,
        suggestionCount,
        status: isOverdue ? SlotStatus.missed : slot.status
      };
    });

    res.json({ data: slotsWithStatus });
  } catch (err) {
    console.error("Error fetching my assignments:", err);
    res.status(500).json({ error: { message: "Could not fetch your suggestion assignments" } });
  }
};
