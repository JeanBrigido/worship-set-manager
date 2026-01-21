import { Request, Response } from "express";
import prisma from "../prisma";
import { Role, SetStatus } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * Helper: Capture singer-song-keys when a worship set is published
 * For each song with both a singer assigned AND a keyOverride,
 * create a SingerSongKey record to track the key history.
 */
async function captureSingerSongKeys(setId: string, serviceDate: Date): Promise<void> {
  // Get all set songs with singer and key info
  const setSongs = await prisma.setSong.findMany({
    where: { setId },
    include: {
      songVersion: { select: { songId: true } },
    },
  });

  // Filter to songs that have both singer and key assigned
  const songsToCapture = setSongs.filter(
    (setSong) => setSong.singerId && setSong.keyOverride
  );

  if (songsToCapture.length === 0) return;

  // Create singer-song-key records (skip if already exists for same singer/song/date)
  for (const setSong of songsToCapture) {
    try {
      await prisma.singerSongKey.create({
        data: {
          singerId: setSong.singerId!,
          songId: setSong.songVersion.songId,
          key: setSong.keyOverride!,
          serviceDate,
        },
      });
    } catch (err: any) {
      // If there's a duplicate or other error, log but don't fail the publish
      console.log(`Note: Could not capture key for singer ${setSong.singerId}, song ${setSong.songVersion.songId}:`, err.message);
    }
  }
}

/**
 * GET /worshipSets
 * List all worship sets
 */
export const listWorshipSets = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const sets = await prisma.worshipSet.findMany({
      include: {
        service: {
          include: {
            serviceType: true
          }
        },
        leaderUser: true,
        _count: {
          select: { setSongs: true }
        }
      },
      orderBy: {
        service: {
          serviceDate: 'desc'
        }
      }
    });

    res.json({ data: sets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch worship sets" } });
  }
};

/**
 * GET /worshipSets/:serviceId
 */
export const getWorshipSet = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { serviceId } = req.params;
    const set = await prisma.worshipSet.findUnique({
      where: { serviceId },
      include: {
        setSongs: {
          include: {
            songVersion: {
              include: {
                song: true,
                chordSheet: { select: { id: true } },
              }
            }
          },
          orderBy: { position: 'asc' }
        },
        suggestionSlots: {
          include: {
            suggestions: {
              include: {
                song: true
              }
            }
          }
        },
        service: true
      },
    });

    if (!set) return res.status(404).json({ error: { message: "Worship set not found" } });
    res.json({ data: set });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch worship set" } });
  }
};

/**
 * POST /worshipSets
 * Creates a worship set and automatically populates assignments from DefaultAssignments
 */
export const createWorshipSet = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { serviceId, suggestDueAt, notes } = req.body;

    // Get the service to find its serviceTypeId
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { serviceTypeId: true },
    });

    if (!service) {
      return res.status(404).json({ error: { message: "Service not found" } });
    }

    // Create worship set and assignments in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the worship set
      const set = await tx.worshipSet.create({
        data: {
          serviceId,
          suggestDueAt: suggestDueAt ? new Date(suggestDueAt) : undefined,
          notes,
        },
      });

      // Get default assignments for this service type
      const defaultAssignments = await tx.defaultAssignment.findMany({
        where: { serviceTypeId: service.serviceTypeId },
      });

      // Create assignments from defaults
      if (defaultAssignments.length > 0) {
        await tx.assignment.createMany({
          data: defaultAssignments.map((da) => ({
            setId: set.id,
            instrumentId: da.instrumentId,
            userId: da.userId,
            status: "invited" as const,
            invitedAt: new Date(),
          })),
        });
      }

      return set;
    });

    // Fetch the created set with assignments
    const setWithAssignments = await prisma.worshipSet.findUnique({
      where: { id: result.id },
      include: {
        assignments: {
          include: {
            instrument: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    res.status(201).json({ data: setWithAssignments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not create worship set" } });
  }
};

/**
 * PUT /worshipSets/:id
 */
export const updateWorshipSet = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;
    const { status, suggestDueAt, notes } = req.body;

    // Check if set exists and get current status
    const existingSet = await prisma.worshipSet.findUnique({
      where: { id },
      include: { setSongs: true, service: true }
    });

    if (!existingSet) {
      return res.status(404).json({ error: { message: "Worship set not found" } });
    }

    // Validate song constraints if publishing
    if (status === 'published' && existingSet.status === 'draft') {
      const songCount = existingSet.setSongs.length;

      if (songCount > 6) {
        return res.status(400).json({
          error: "Cannot publish worship set with more than 6 songs"
        });
      }

      // Check for new songs (familiarityScore < 50)
      const setSongsWithDetails = await prisma.setSong.findMany({
        where: { setId: id },
        include: { songVersion: { include: { song: true } } }
      });

      const newSongs = setSongsWithDetails.filter(setSong =>
        setSong.songVersion.song.familiarityScore < 50
      );

      if (newSongs.length > 1) {
        return res.status(400).json({
          error: "Cannot publish worship set with more than 1 new song (familiarity score < 50)"
        });
      }
    }

    const updated = await prisma.worshipSet.update({
      where: { id },
      data: {
        status: status as SetStatus,
        suggestDueAt: suggestDueAt ? new Date(suggestDueAt) : undefined,
        notes,
      },
    });

    // Auto-capture singer-song-keys when publishing
    if (status === 'published') {
      await captureSingerSongKeys(id, existingSet.service.serviceDate);
    }

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not update worship set" } });
  }
};

/**
 * POST /worshipSets/:id/publish
 */
export const publishWorshipSet = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;

    // Use the update method with publish status
    req.body = { status: 'published' };
    return updateWorshipSet(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not publish worship set" } });
  }
};

/**
 * DELETE /worshipSets/:id
 */
export const deleteWorshipSet = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;

    await prisma.worshipSet.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not delete worship set" } });
  }
};

/**
 * PUT /worship-sets/:id/assign-leader
 * Manually assign a leader to a worship set (Admin only)
 */
export const assignLeader = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Admin access required" } });
    }

    const { id } = req.params;
    const { leaderUserId } = req.body;

    // Verify the user exists and has leader role
    if (leaderUserId) {
      const user = await prisma.user.findUnique({
        where: { id: leaderUserId },
        select: { roles: true }
      });

      if (!user || !user.roles.includes(Role.leader)) {
        return res.status(400).json({
          error: { message: "User must have leader role to be assigned" }
        });
      }
    }

    const updated = await prisma.worshipSet.update({
      where: { id },
      data: { leaderUserId },
      include: {
        leaderUser: { select: { id: true, name: true, email: true } },
        service: true
      }
    });

    res.json({ data: updated });
  } catch (err: any) {
    console.error("Error assigning leader:", err);

    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: "Worship set not found" } });
    }

    res.status(500).json({ error: { message: "Could not assign leader" } });
  }
};

/**
 * GET /worship-sets/:id/suggested-leader
 * Get the suggested leader for a worship set based on rotation
 */
export const getSuggestedLeader = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;

    const worshipSet = await prisma.worshipSet.findUnique({
      where: { id },
      include: { service: true }
    });

    if (!worshipSet) {
      return res.status(404).json({ error: { message: "Worship set not found" } });
    }

    // Get all active rotations for this service type
    const rotations = await prisma.leaderRotation.findMany({
      where: {
        serviceTypeId: worshipSet.service.serviceTypeId,
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
        serviceTypeId: worshipSet.service.serviceTypeId,
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
    console.error("Error getting suggested leader:", err);
    res.status(500).json({ error: { message: "Could not determine suggested leader" } });
  }
};
