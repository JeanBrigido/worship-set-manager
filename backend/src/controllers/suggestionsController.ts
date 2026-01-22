import { Request, Response } from "express";
import logger from "../utils/logger";
import prisma from "../prisma";
import { Role, SuggestionStatus, SlotStatus } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /suggestions/slot/:slotId
 * Authorization: Admin, Leader, or user assigned to this slot
 */
export const listSuggestionsForSlot = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { slotId } = req.params;
    const userId = req.user?.userId;
    const isAdminOrLeader = req.user?.roles.some(r => r === Role.admin || r === Role.leader);

    // Get the slot to check authorization
    const slot = await prisma.suggestionSlot.findUnique({
      where: { id: slotId },
      select: { assignedUserId: true, setId: true }
    });

    if (!slot) {
      return res.status(404).json({ error: { message: "Slot not found" } });
    }

    // Check authorization: admin/leader, or assigned to this slot
    if (!isAdminOrLeader && slot.assignedUserId !== userId) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const suggestions = await prisma.suggestion.findMany({
      where: { slotId },
      include: { song: true },
    });
    res.json({ data: suggestions });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not list suggestions" } });
  }
};

/**
 * GET /suggestions/:id
 * Authorization: Admin, Leader, or user assigned to this slot
 */
export const getSuggestion = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const isAdminOrLeader = req.user?.roles.some(r => r === Role.admin || r === Role.leader);

    const suggestion = await prisma.suggestion.findUnique({
      where: { id },
      include: {
        song: true,
        suggestionSlot: { select: { assignedUserId: true } }
      },
    });
    if (!suggestion) return res.status(404).json({ error: { message: "Suggestion not found" } });

    // Check authorization: admin/leader, or assigned to this slot
    if (!isAdminOrLeader && suggestion.suggestionSlot.assignedUserId !== userId) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    res.json({ data: suggestion });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not fetch suggestion" } });
  }
};

/**
 * POST /suggestions
 */
export const createSuggestion = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { slotId, songId, youtubeUrlOverride, notes } = req.body;

    // Get slot to check due date
    const slot = await prisma.suggestionSlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) return res.status(404).json({ error: { message: "Slot not found" } });

    // Check if suggestions are still allowed (before slot due date)
    if (slot.dueAt && new Date() > slot.dueAt) {
      return res.status(400).json({
        error: "Suggestion deadline has passed"
      });
    }

    // Only the assigned user can add suggestions to their slot
    if (slot.assignedUserId !== req.user?.userId && !req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    // Check for duplicate suggestions (same user, same slot, same song)
    const existingSuggestion = await prisma.suggestion.findFirst({
      where: {
        slotId,
        songId,
        suggestionSlot: {
          assignedUserId: req.user?.userId
        }
      }
    });

    if (existingSuggestion) {
      return res.status(400).json({
        error: "You have already suggested this song for this slot"
      });
    }

    const suggestion = await prisma.suggestion.create({
      data: { slotId, songId, youtubeUrlOverride, notes },
      include: {
        song: true,
        suggestionSlot: {
          include: {
            _count: {
              select: { suggestions: true }
            }
          }
        }
      }
    });

    // Auto-update slot status to 'submitted' when min requirements met
    const suggestionCount = suggestion.suggestionSlot._count.suggestions;
    if (slot.status === SlotStatus.pending && suggestionCount >= slot.minSongs) {
      await prisma.suggestionSlot.update({
        where: { id: slotId },
        data: { status: SlotStatus.submitted }
      });
    }

    res.status(201).json({ data: suggestion });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not create suggestion" } });
  }
};

/**
 * PUT /suggestions/:id
 */
export const updateSuggestion = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const { youtubeUrlOverride, notes } = req.body;

    const suggestion = await prisma.suggestion.findUnique({ where: { id }, include: { suggestionSlot: true } });
    if (!suggestion) return res.status(404).json({ error: { message: "Suggestion not found" } });

    // Only the assigned user or Admin can update
    if (
      suggestion.suggestionSlot.assignedUserId !== req.user?.userId &&
      !req.user?.roles.includes(Role.admin)
    ) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const updated = await prisma.suggestion.update({
      where: { id },
      data: { youtubeUrlOverride, notes },
    });

    res.json({ data: updated });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not update suggestion" } });
  }
};

/**
 * DELETE /suggestions/:id
 */
export const deleteSuggestion = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;

    const suggestion = await prisma.suggestion.findUnique({ where: { id }, include: { suggestionSlot: true } });
    if (!suggestion) return res.status(404).json({ error: { message: "Suggestion not found" } });

    if (
      suggestion.suggestionSlot.assignedUserId !== req.user?.userId &&
      !req.user?.roles.includes(Role.admin) &&
      !req.user?.roles.includes(Role.leader)
    ) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    await prisma.suggestion.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not delete suggestion" } });
  }
};

/**
 * GET /suggestions/by-worship-set/:worshipSetId
 * Get all suggestions for a worship set (for display in worship set builder)
 * Authorization: Admin, Leader, worship set leader, or team member with assignment/slot
 */
export const getSuggestionsByWorshipSet = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { worshipSetId } = req.params;
    const userId = req.user?.userId;
    const isAdminOrLeader = req.user?.roles.some(r => r === Role.admin || r === Role.leader);

    // Check if user has access to this worship set
    if (!isAdminOrLeader) {
      const worshipSet = await prisma.worshipSet.findUnique({
        where: { id: worshipSetId },
        select: {
          leaderUserId: true,
          assignments: { where: { userId }, select: { id: true } },
          suggestionSlots: { where: { assignedUserId: userId }, select: { id: true } }
        }
      });

      if (!worshipSet) {
        return res.status(404).json({ error: { message: "Worship set not found" } });
      }

      // User must be the worship set leader, have an assignment, or have a suggestion slot
      const isLeader = worshipSet.leaderUserId === userId;
      const hasAssignment = worshipSet.assignments.length > 0;
      const hasSlot = worshipSet.suggestionSlots.length > 0;

      if (!isLeader && !hasAssignment && !hasSlot) {
        return res.status(403).json({ error: { message: "Forbidden" } });
      }
    }

    // Get all suggestion slots for this worship set with their suggestions
    const slots = await prisma.suggestionSlot.findMany({
      where: { setId: worshipSetId },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true }
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
      }
    });

    // Flatten suggestions and include suggester info
    const allSuggestions = slots.flatMap(slot =>
      slot.suggestions.map(suggestion => ({
        ...suggestion,
        suggester: slot.assignedUser,
        slotInfo: {
          id: slot.id,
          minSongs: slot.minSongs,
          maxSongs: slot.maxSongs,
          dueAt: slot.dueAt,
          status: slot.status
        }
      }))
    );

    res.json({ data: allSuggestions });
  } catch (err) {
    logger.error({ err }, 'Error fetching suggestions by worship set:');
    res.status(500).json({ error: { message: "Could not fetch suggestions for worship set" } });
  }
};

/**
 * PUT /suggestions/:id/approve
 * Approve a suggestion and optionally add it to the worship set
 */
export const approveSuggestion = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const { addToSet, songVersionId, position } = req.body;

    const suggestion = await prisma.suggestion.findUnique({
      where: { id },
      include: {
        suggestionSlot: {
          include: {
            worshipSet: {
              include: {
                setSongs: true
              }
            }
          }
        },
        song: {
          include: {
            versions: true
          }
        }
      }
    });

    if (!suggestion) {
      return res.status(404).json({ error: { message: "Suggestion not found" } });
    }

    // Only Admin or Worship Set Leader can approve
    const isAdmin = req.user?.roles.includes(Role.admin);
    const isWorshipSetLeader = suggestion.suggestionSlot.worshipSet.leaderUserId === req.user?.userId;

    if (!isAdmin && !isWorshipSetLeader) {
      return res.status(403).json({
        error: { message: "Only the worship set leader or an admin can approve suggestions" }
      });
    }

    // If adding to set, create a SetSong
    if (addToSet && songVersionId) {
      const worshipSet = suggestion.suggestionSlot.worshipSet;

      // Check if worship set is at max capacity (6 songs)
      if (worshipSet.setSongs.length >= 6) {
        return res.status(400).json({
          error: { message: "Worship set is at maximum capacity (6 songs)" }
        });
      }

      // Calculate position if not provided
      const setSongPosition = position || worshipSet.setSongs.length + 1;

      await prisma.setSong.create({
        data: {
          setId: worshipSet.id,
          songVersionId: songVersionId,
          position: setSongPosition,
        }
      });
    }

    // Mark suggestion as approved
    const updatedSuggestion = await prisma.suggestion.update({
      where: { id },
      data: { status: SuggestionStatus.approved }
    });

    res.json({
      data: {
        message: addToSet ? "Suggestion approved and added to worship set" : "Suggestion approved",
        suggestion: updatedSuggestion
      }
    });
  } catch (err) {
    logger.error({ err }, 'Error approving suggestion:');
    res.status(500).json({ error: { message: "Could not approve suggestion" } });
  }
};

/**
 * PUT /suggestions/:id/reject
 * Reject a suggestion
 */
export const rejectSuggestion = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;

    const suggestion = await prisma.suggestion.findUnique({
      where: { id },
      include: {
        suggestionSlot: {
          include: {
            worshipSet: true
          }
        }
      }
    });

    if (!suggestion) {
      return res.status(404).json({ error: { message: "Suggestion not found" } });
    }

    // Only Admin or Worship Set Leader can reject
    const isAdmin = req.user?.roles.includes(Role.admin);
    const isWorshipSetLeader = suggestion.suggestionSlot.worshipSet.leaderUserId === req.user?.userId;

    if (!isAdmin && !isWorshipSetLeader) {
      return res.status(403).json({
        error: { message: "Only the worship set leader or an admin can reject suggestions" }
      });
    }

    // Mark suggestion as rejected
    const updatedSuggestion = await prisma.suggestion.update({
      where: { id },
      data: { status: SuggestionStatus.rejected }
    });

    res.json({ data: { message: "Suggestion rejected", suggestion: updatedSuggestion } });
  } catch (err) {
    logger.error({ err }, 'Error rejecting suggestion:');
    res.status(500).json({ error: { message: "Could not reject suggestion" } });
  }
};
