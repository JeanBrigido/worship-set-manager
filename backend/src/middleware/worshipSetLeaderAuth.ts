import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import prisma from '../prisma';

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * Middleware to check if the authenticated user is the leader of a worship set
 * or is an admin. This gives temporary leadership permissions for a specific worship set.
 *
 * Usage:
 * router.put('/worship-sets/:id/songs', authMiddleware, requireWorshipSetLeader, controller.updateSongs)
 */
export const requireWorshipSetLeader = async (
  req: Request & { user?: JwtPayload },
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        error: { message: 'Authentication required' }
      });
    }

    const worshipSetId = req.params.id || req.params.worshipSetId;

    if (!worshipSetId) {
      return res.status(400).json({
        error: { message: 'Worship set ID is required' }
      });
    }

    // Check if user is admin (admins can manage any worship set)
    if (req.user.roles?.includes(Role.admin)) {
      return next();
    }

    // Check if user is the leader of this specific worship set
    const worshipSet = await prisma.worshipSet.findUnique({
      where: { id: worshipSetId },
      select: {
        leaderUserId: true,
        service: {
          select: {
            serviceDate: true
          }
        }
      }
    });

    if (!worshipSet) {
      return res.status(404).json({
        error: { message: 'Worship set not found' }
      });
    }

    // Check if user is the assigned leader
    if (worshipSet.leaderUserId === req.user.userId) {
      return next();
    }

    // User is neither admin nor the worship set leader
    return res.status(403).json({
      error: {
        message: 'Only the worship set leader or an admin can perform this action'
      }
    });

  } catch (error) {
    console.error('Error in requireWorshipSetLeader middleware:', error);
    return res.status(500).json({
      error: { message: 'Failed to verify worship set leader permissions' }
    });
  }
};

/**
 * Middleware to check if user is leader of the worship set associated with an assignment.
 * Used for assignment-related endpoints where the worship set ID is not directly in the URL.
 */
export const requireAssignmentWorshipSetLeader = async (
  req: Request & { user?: JwtPayload },
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        error: { message: 'Authentication required' }
      });
    }

    const assignmentId = req.params.id || req.params.assignmentId;

    if (!assignmentId) {
      return res.status(400).json({
        error: { message: 'Assignment ID is required' }
      });
    }

    // Check if user is admin
    if (req.user.roles?.includes(Role.admin)) {
      return next();
    }

    // Get the assignment and its associated worship set
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        worshipSet: {
          select: {
            leaderUserId: true
          }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({
        error: { message: 'Assignment not found' }
      });
    }

    // Check if user is the worship set leader
    if (assignment.worshipSet.leaderUserId === req.user.userId) {
      return next();
    }

    return res.status(403).json({
      error: {
        message: 'Only the worship set leader or an admin can manage this assignment'
      }
    });

  } catch (error) {
    console.error('Error in requireAssignmentWorshipSetLeader middleware:', error);
    return res.status(500).json({
      error: { message: 'Failed to verify worship set leader permissions' }
    });
  }
};

/**
 * Helper function to check if a user is the leader of a specific worship set.
 * Useful for controller logic that needs to check leadership status.
 */
export const isWorshipSetLeader = async (
  userId: string,
  worshipSetId: string
): Promise<boolean> => {
  const worshipSet = await prisma.worshipSet.findUnique({
    where: { id: worshipSetId },
    select: { leaderUserId: true }
  });

  return worshipSet?.leaderUserId === userId;
};

/**
 * Helper function to check if user is admin OR worship set leader
 */
export const canManageWorshipSet = async (
  userId: string,
  roles: string[],
  worshipSetId: string
): Promise<boolean> => {
  if (roles.includes('Admin')) {
    return true;
  }

  return await isWorshipSetLeader(userId, worshipSetId);
};
