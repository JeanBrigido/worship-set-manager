import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /suggestions/slot/:slotId
 */
export const listSuggestionsForSlot = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { slotId } = req.params;
    const suggestions = await prisma.suggestion.findMany({
      where: { slotId },
      include: { song: true },
    });
    res.json({ data: suggestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not list suggestions" });
  }
};

/**
 * GET /suggestions/:id
 */
export const getSuggestion = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const suggestion = await prisma.suggestion.findUnique({
      where: { id },
      include: { song: true },
    });
    if (!suggestion) return res.status(404).json({ error: "Suggestion not found" });
    res.json({ data: suggestion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch suggestion" });
  }
};

/**
 * POST /suggestions
 */
export const createSuggestion = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { slotId, songId, youtubeUrlOverride, notes } = req.body;

    // Get slot with worship set to check due date
    const slot = await prisma.suggestionSlot.findUnique({
      where: { id: slotId },
      include: {
        worshipSet: {
          select: { suggestDueAt: true }
        }
      }
    });

    if (!slot) return res.status(404).json({ error: "Slot not found" });

    // Check if suggestions are still allowed (before due date)
    if (slot.worshipSet.suggestDueAt && new Date() > slot.worshipSet.suggestDueAt) {
      return res.status(400).json({
        error: "Suggestion deadline has passed"
      });
    }

    // Only the assigned user can add suggestions to their slot
    if (slot.assignedUserId !== req.user?.userId && !req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: "Forbidden" });
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
        suggestionSlot: true
      }
    });

    res.status(201).json({ data: suggestion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create suggestion" });
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
    if (!suggestion) return res.status(404).json({ error: "Suggestion not found" });

    // Only the assigned user or Admin can update
    if (
      suggestion.suggestionSlot.assignedUserId !== req.user?.userId &&
      !req.user?.roles.includes(Role.admin)
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updated = await prisma.suggestion.update({
      where: { id },
      data: { youtubeUrlOverride, notes },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update suggestion" });
  }
};

/**
 * DELETE /suggestions/:id
 */
export const deleteSuggestion = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;

    const suggestion = await prisma.suggestion.findUnique({ where: { id }, include: { suggestionSlot: true } });
    if (!suggestion) return res.status(404).json({ error: "Suggestion not found" });

    if (
      suggestion.suggestionSlot.assignedUserId !== req.user?.userId &&
      !req.user?.roles.includes(Role.admin) &&
      !req.user?.roles.includes(Role.leader)
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.suggestion.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete suggestion" });
  }
};

/**
 * GET /suggestions/by-worship-set/:worshipSetId
 * Get all suggestions for a worship set (for display in worship set builder)
 */
export const getSuggestionsByWorshipSet = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { worshipSetId } = req.params;

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
    console.error("Error fetching suggestions by worship set:", err);
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

    // Mark suggestion as approved (we can use deletion as approval for now, or add a status field)
    // For now, we'll just delete the suggestion after approval
    await prisma.suggestion.delete({ where: { id } });

    res.json({
      data: {
        message: addToSet ? "Suggestion approved and added to worship set" : "Suggestion approved"
      }
    });
  } catch (err) {
    console.error("Error approving suggestion:", err);
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

    // Delete the suggestion to reject it
    await prisma.suggestion.delete({ where: { id } });

    res.json({ data: { message: "Suggestion rejected" } });
  } catch (err) {
    console.error("Error rejecting suggestion:", err);
    res.status(500).json({ error: { message: "Could not reject suggestion" } });
  }
};
