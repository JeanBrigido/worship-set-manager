import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /setSongs/set/:setId
 */
export const listSetSongs = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { setId } = req.params;
    const songs = await prisma.setSong.findMany({
      where: { setId },
      orderBy: { position: "asc" },
      include: {
        songVersion: {
          include: {
            song: true,
            chordSheet: { select: { id: true } },
          },
        },
        singer: { select: { id: true, name: true } },
      },
    });
    res.json({ data: songs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not list set songs" } });
  }
};

/**
 * GET /setSongs/:id
 */
export const getSetSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const song = await prisma.setSong.findUnique({
      where: { id },
      include: {
        songVersion: {
          include: {
            song: true,
            chordSheet: { select: { id: true } },
          },
        },
        singer: { select: { id: true, name: true } },
      },
    });
    if (!song) return res.status(404).json({ error: { message: "Set song not found" } });
    res.json({ data: song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch set song" } });
  }
};

/**
 * POST /setSongs
 */
export const createSetSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { setId, songVersionId, position, keyOverride, youtubeUrlOverride, isNew, notes, singerId } = req.body;

    // Auto-determine isNew based on song's familiarity score if not explicitly provided
    let shouldBeNew = isNew;
    if (shouldBeNew === undefined || shouldBeNew === null) {
      // Fetch the song to check its familiarity score
      const songVersion = await prisma.songVersion.findUnique({
        where: { id: songVersionId },
        include: { song: true }
      });

      if (songVersion?.song) {
        // Songs with familiarityScore < 50 are considered "new" to the congregation
        shouldBeNew = songVersion.song.familiarityScore < 50;
      } else {
        shouldBeNew = false;
      }
    }

    const song = await prisma.setSong.create({
      data: {
        setId,
        songVersionId,
        position,
        keyOverride,
        youtubeUrlOverride,
        isNew: shouldBeNew,
        notes,
        singerId,
      },
      include: {
        songVersion: {
          include: {
            song: true,
            chordSheet: { select: { id: true } },
          },
        },
        singer: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ data: song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not add song to set" } });
  }
};

/**
 * PUT /setSongs/:id
 */
export const updateSetSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;
    const { position, keyOverride, youtubeUrlOverride, isNew, notes, singerId } = req.body;

    const updated = await prisma.setSong.update({
      where: { id },
      data: { position, keyOverride, youtubeUrlOverride, isNew, notes, singerId },
      include: {
        songVersion: {
          include: {
            song: true,
            chordSheet: { select: { id: true } },
          },
        },
        singer: { select: { id: true, name: true } },
      },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not update set song" } });
  }
};

/**
 * DELETE /setSongs/:id
 */
export const deleteSetSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;

    // Get the setSong to know its setId and position before deleting
    const setSong = await prisma.setSong.findUnique({
      where: { id },
      select: { setId: true, position: true }
    });

    if (!setSong) {
      return res.status(404).json({ error: { message: "Set song not found" } });
    }

    // Use a transaction to delete and reorder in one atomic operation
    await prisma.$transaction(async (tx) => {
      // Delete the setSong
      await tx.setSong.delete({ where: { id } });

      // Reorder remaining songs: decrement positions greater than deleted position
      await tx.setSong.updateMany({
        where: {
          setId: setSong.setId,
          position: { gt: setSong.position }
        },
        data: {
          position: { decrement: 1 }
        }
      });
    });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not delete set song" } });
  }
};

/**
 * PUT /setSongs/set/:setId/reorder
 * Reorder songs in a worship set
 */
export const reorderSetSongs = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { setId } = req.params;
    const { songIds } = req.body as { songIds: string[] };

    if (!Array.isArray(songIds) || songIds.length === 0) {
      return res.status(400).json({ error: { message: "songIds must be a non-empty array" } });
    }

    // Verify all song IDs belong to this set
    const existingSongs = await prisma.setSong.findMany({
      where: { setId },
      select: { id: true }
    });

    const existingIds = new Set(existingSongs.map(s => s.id));
    const invalidIds = songIds.filter(id => !existingIds.has(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({
        error: "Some song IDs do not belong to this worship set",
        invalidIds
      });
    }

    // Update all positions in a transaction
    // First set to negative values to avoid unique constraint conflicts, then set final values
    await prisma.$transaction(async (tx) => {
      // Set all to temporary negative positions
      for (let i = 0; i < songIds.length; i++) {
        await tx.setSong.update({
          where: { id: songIds[i] },
          data: { position: -(i + 1) }
        });
      }
      // Set final positive positions
      for (let i = 0; i < songIds.length; i++) {
        await tx.setSong.update({
          where: { id: songIds[i] },
          data: { position: i + 1 }
        });
      }
    });

    // Return the reordered songs
    const reorderedSongs = await prisma.setSong.findMany({
      where: { setId },
      orderBy: { position: "asc" },
      include: {
        songVersion: {
          include: {
            song: true,
            chordSheet: { select: { id: true } },
          },
        },
        singer: { select: { id: true, name: true } },
      },
    });

    res.json({ data: reorderedSongs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not reorder songs" } });
  }
};

/**
 * POST /setSongs/:id/listened
 * Mark a song as listened by the current user
 */
export const markListened = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { message: "Unauthorized" } });
    }

    const { id } = req.params;

    // Verify the setSong exists
    const setSong = await prisma.setSong.findUnique({
      where: { id },
    });

    if (!setSong) {
      return res.status(404).json({ error: { message: "Set song not found" } });
    }

    // Create or update the progress record (upsert)
    const progress = await prisma.userSetSongProgress.upsert({
      where: {
        userId_setSongId: {
          userId: req.user.userId,
          setSongId: id,
        },
      },
      update: {
        listenedAt: new Date(),
      },
      create: {
        userId: req.user.userId,
        setSongId: id,
      },
    });

    res.json({ data: { listenedAt: progress.listenedAt } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not mark song as listened" } });
  }
};

/**
 * DELETE /setSongs/:id/listened
 * Unmark a song as listened by the current user
 */
export const unmarkListened = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { message: "Unauthorized" } });
    }

    const { id } = req.params;

    // Delete the progress record if it exists
    await prisma.userSetSongProgress.deleteMany({
      where: {
        userId: req.user.userId,
        setSongId: id,
      },
    });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not unmark song as listened" } });
  }
};
