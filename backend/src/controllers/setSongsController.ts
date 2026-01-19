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
      include: { songVersion: { include: { song: true } } },
    });
    res.json({ data: songs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not list set songs" });
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
      include: { songVersion: { include: { song: true } } },
    });
    if (!song) return res.status(404).json({ error: "Set song not found" });
    res.json({ data: song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch set song" });
  }
};

/**
 * POST /setSongs
 */
export const createSetSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { setId, songVersionId, position, keyOverride, youtubeUrlOverride, isNew, notes } = req.body;

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
      },
    });

    res.status(201).json({ data: song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not add song to set" });
  }
};

/**
 * PUT /setSongs/:id
 */
export const updateSetSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;
    const { position, keyOverride, youtubeUrlOverride, isNew, notes } = req.body;

    const updated = await prisma.setSong.update({
      where: { id },
      data: { position, keyOverride, youtubeUrlOverride, isNew, notes },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update set song" });
  }
};

/**
 * DELETE /setSongs/:id
 */
export const deleteSetSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;

    // Get the setSong to know its setId and position before deleting
    const setSong = await prisma.setSong.findUnique({
      where: { id },
      select: { setId: true, position: true }
    });

    if (!setSong) {
      return res.status(404).json({ error: "Set song not found" });
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
    res.status(500).json({ error: "Could not delete set song" });
  }
};

/**
 * PUT /setSongs/set/:setId/reorder
 * Reorder songs in a worship set
 */
export const reorderSetSongs = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { setId } = req.params;
    const { songIds } = req.body as { songIds: string[] };

    if (!Array.isArray(songIds) || songIds.length === 0) {
      return res.status(400).json({ error: "songIds must be a non-empty array" });
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
    await prisma.$transaction(
      songIds.map((songId, index) =>
        prisma.setSong.update({
          where: { id: songId },
          data: { position: index + 1 }
        })
      )
    );

    // Return the reordered songs
    const reorderedSongs = await prisma.setSong.findMany({
      where: { setId },
      orderBy: { position: "asc" },
      include: { songVersion: { include: { song: true } } }
    });

    res.json({ data: reorderedSongs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not reorder songs" });
  }
};
