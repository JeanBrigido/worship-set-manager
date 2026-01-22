import { Request, Response } from "express";
import logger from "../utils/logger";
import prisma from "../prisma";
import { Role, AssignmentStatus } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /assignments
 * List all assignments (for current user or all if admin/leader)
 * Query params: page, limit, status
 */
export const listAssignments = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const status = req.query.status as AssignmentStatus | undefined;
    const isAdminOrLeader = req.user?.roles.includes(Role.admin) || req.user?.roles.includes(Role.leader);

    // Build where clause
    const where: any = isAdminOrLeader ? {} : { userId: req.user?.userId };
    if (status && Object.values(AssignmentStatus).includes(status)) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.assignment.count({ where });

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        instrument: true,
        user: { select: { id: true, name: true, email: true } },
        worshipSet: {
          include: {
            service: {
              include: {
                serviceType: true
              }
            }
          }
        }
      },
      orderBy: {
        invitedAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      data: assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not list assignments" } });
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
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not list assignments" } });
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
    if (!assignment) return res.status(404).json({ error: { message: "Assignment not found" } });
    res.json({ data: assignment });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not fetch assignment" } });
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
      return res.status(404).json({ error: { message: "Worship set not found" } });
    }

    const isAdmin = req.user?.roles.includes(Role.admin);
    const isWorshipSetLeader = worshipSet.leaderUserId === req.user?.userId;

    if (!isAdmin && !isWorshipSetLeader) {
      return res.status(403).json({
        error: "Only the worship set leader or an admin can create assignments"
      });
    }

    // Get the instrument to check maxPerSet
    const instrument = await prisma.instrument.findUnique({
      where: { id: instrumentId }
    });

    if (!instrument) {
      return res.status(404).json({ error: { message: "Instrument not found" } });
    }

    // Count existing assignments for this instrument in this set
    const existingCount = await prisma.assignment.count({
      where: {
        setId,
        instrumentId,
      },
    });

    if (existingCount >= instrument.maxPerSet) {
      return res.status(400).json({
        error: `Maximum ${instrument.maxPerSet} ${instrument.displayName}(s) allowed per worship set`
      });
    }

    // Check for duplicate assignment (same user, same instrument, same set)
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        setId,
        instrumentId,
        userId,
      },
    });

    if (existingAssignment) {
      return res.status(400).json({
        error: "This user is already assigned to this instrument for this worship set"
      });
    }

    const assignment = await prisma.assignment.create({
      data: {
        setId,
        instrumentId,
        userId,
        status: (status as AssignmentStatus) || 'invited',
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
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not create assignment" } });
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
    if (!assignment) return res.status(404).json({ error: { message: "Assignment not found" } });

    // Only Admin/Leader or the assigned user can update
    if (
      assignment.userId !== req.user?.userId &&
      !req.user?.roles.includes(Role.admin) &&
      !req.user?.roles.includes(Role.leader)
    ) {
      return res.status(403).json({ error: { message: "Forbidden" } });
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
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not update assignment" } });
  }
};

/**
 * DELETE /assignments/:id
 */
export const deleteAssignment = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;

    await prisma.assignment.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not delete assignment" } });
  }
};
