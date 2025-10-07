import { Request, Response } from "express";
import prisma from "../prisma";
import { Role, AssignmentStatus } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /assignments
 * List all assignments (for current user or all if admin/leader)
 */
export const listAssignments = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const isAdminOrLeader = req.user?.roles.includes(Role.admin) || req.user?.roles.includes(Role.leader);

    const assignments = await prisma.assignment.findMany({
      where: isAdminOrLeader ? {} : { userId: req.user?.userId },
      include: {
        instrument: true,
        user: true,
        worshipSet: {
          include: {
            service: true
          }
        }
      },
      orderBy: {
        invitedAt: 'desc'
      }
    });

    res.json({ data: assignments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not list assignments" });
  }
};

/**
 * GET /assignments/set/:setId
 */
export const listAssignmentsForSet = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { setId } = req.params;
    const assignments = await prisma.assignment.findMany({
      where: { setId },
      include: { instrument: true, user: true },
    });
    res.json({ data: assignments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not list assignments" });
  }
};

/**
 * GET /assignments/:id
 */
export const getAssignment = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { instrument: true, user: true },
    });
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    res.json({ data: assignment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch assignment" });
  }
};

/**
 * POST /assignments
 */
export const createAssignment = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { setId, instrumentId, userId, status } = req.body;

    // Check if user is admin or the worship set leader
    const worshipSet = await prisma.worshipSet.findUnique({
      where: { id: setId },
      select: { leaderUserId: true }
    });

    if (!worshipSet) {
      return res.status(404).json({ error: "Worship set not found" });
    }

    const isAdmin = req.user?.roles.includes(Role.admin);
    const isWorshipSetLeader = worshipSet.leaderUserId === req.user?.userId;

    if (!isAdmin && !isWorshipSetLeader) {
      return res.status(403).json({
        error: "Only the worship set leader or an admin can create assignments"
      });
    }

    // Check for unique constraint (setId + instrumentId)
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        setId,
        instrumentId,
      },
    });

    if (existingAssignment) {
      return res.status(400).json({
        error: "This instrument is already assigned for this worship set"
      });
    }

    const assignment = await prisma.assignment.create({
      data: {
        setId,
        instrumentId,
        userId,
        status: status as AssignmentStatus || 'PENDING',
        invitedAt: new Date(),
      },
      include: {
        instrument: true,
        user: true,
        worshipSet: true
      }
    });

    res.status(201).json({ data: assignment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create assignment" });
  }
};

/**
 * PUT /assignments/:id
 */
export const updateAssignment = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    // Only Admin/Leader or the assigned user can update
    if (
      assignment.userId !== req.user?.userId &&
      !req.user?.roles.includes(Role.admin) &&
      !req.user?.roles.includes(Role.leader)
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        status: status as AssignmentStatus,
        respondedAt: new Date(),
      },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update assignment" });
  }
};

/**
 * DELETE /assignments/:id
 */
export const deleteAssignment = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;

    await prisma.assignment.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete assignment" });
  }
};
