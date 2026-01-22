import { Request, Response } from "express";
import logger from "../utils/logger";
import prisma from "../prisma";
import { Role } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /singer-song-keys
 * Query params: singerId, songId (optional filters)
 */
export const listSingerSongKeys = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { singerId, songId } = req.query;

    const where: { singerId?: string; songId?: string } = {};
    if (singerId) where.singerId = singerId as string;
    if (songId) where.songId = songId as string;

    const keys = await prisma.singerSongKey.findMany({
      where,
      orderBy: { serviceDate: "desc" },
      include: {
        singer: { select: { id: true, name: true } },
        song: { select: { id: true, title: true, artist: true } },
      },
    });

    res.json({ data: keys });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not list singer song keys" } });
  }
};

/**
 * GET /singer-song-keys/:id
 */
export const getSingerSongKey = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const key = await prisma.singerSongKey.findUnique({
      where: { id },
      include: {
        singer: { select: { id: true, name: true } },
        song: { select: { id: true, title: true, artist: true } },
      },
    });

    if (!key) {
      return res.status(404).json({ error: { message: "Singer song key not found" } });
    }

    res.json({ data: key });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not fetch singer song key" } });
  }
};

/**
 * GET /singer-song-keys/suggestions
 * Get key suggestions for a singer + song combination
 * Query params: singerId (optional), songId (required)
 */
export const getSuggestions = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { singerId, songId } = req.query;

    if (!songId) {
      return res.status(400).json({ error: { message: "songId is required" } });
    }

    // Get singer's history for this song (if singerId provided)
    const singerHistory = singerId
      ? await prisma.singerSongKey.findMany({
          where: { singerId: singerId as string, songId: songId as string },
          orderBy: { serviceDate: "desc" },
          take: 10,
          include: {
            singer: { select: { id: true, name: true } },
          },
        })
      : [];

    // Get other singers' keys for this song (for reference)
    // Group by singer and get most recent for each
    const otherSingersHistory = await prisma.singerSongKey.findMany({
      where: {
        songId: songId as string,
        ...(singerId ? { singerId: { not: singerId as string } } : {}),
      },
      orderBy: { serviceDate: "desc" },
      include: {
        singer: { select: { id: true, name: true } },
      },
    });

    // Group by singer, keeping most recent entry per singer
    const singerMap = new Map<string, typeof otherSingersHistory[0]>();
    for (const entry of otherSingersHistory) {
      if (!singerMap.has(entry.singerId)) {
        singerMap.set(entry.singerId, entry);
      }
    }
    const otherSingersLatest = Array.from(singerMap.values());

    // Get the song's default key from song versions
    const songVersions = await prisma.songVersion.findMany({
      where: { songId: songId as string },
      select: { id: true, name: true, defaultKey: true },
    });

    res.json({
      data: {
        singerHistory,
        otherSingersHistory: otherSingersLatest,
        songVersions,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not fetch key suggestions" } });
  }
};

/**
 * POST /singer-song-keys
 * Manually add a singer-song-key record
 */
export const createSingerSongKey = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Admin or Leader access required" } });
    }

    const { singerId, songId, key, serviceDate, notes } = req.body;

    // Verify singer exists
    const singer = await prisma.user.findUnique({ where: { id: singerId } });
    if (!singer) {
      return res.status(400).json({ error: { message: "Singer not found" } });
    }

    // Verify song exists
    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song) {
      return res.status(400).json({ error: { message: "Song not found" } });
    }

    const record = await prisma.singerSongKey.create({
      data: {
        singerId,
        songId,
        key,
        serviceDate: new Date(serviceDate),
        notes,
      },
      include: {
        singer: { select: { id: true, name: true } },
        song: { select: { id: true, title: true, artist: true } },
      },
    });

    res.status(201).json({ data: record });
  } catch (err) {
    logger.error({ err }, 'Error creating singer song key:');
    res.status(500).json({ error: { message: "Could not create singer song key" } });
  }
};

/**
 * PUT /singer-song-keys/:id
 */
export const updateSingerSongKey = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Admin or Leader access required" } });
    }

    const { id } = req.params;
    const { key, notes } = req.body;

    // Build update data
    const updateData: { key?: string; notes?: string | null } = {};
    if (key !== undefined) updateData.key = key;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.singerSongKey.update({
      where: { id },
      data: updateData,
      include: {
        singer: { select: { id: true, name: true } },
        song: { select: { id: true, title: true, artist: true } },
      },
    });

    res.json({ data: updated });
  } catch (err: any) {
    logger.error({ err }, 'Error updating singer song key:');

    if (err.code === "P2025") {
      return res.status(404).json({ error: { message: "Singer song key not found" } });
    }

    res.status(500).json({ error: { message: "Could not update singer song key" } });
  }
};

/**
 * DELETE /singer-song-keys/:id
 */
export const deleteSingerSongKey = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Admin or Leader access required" } });
    }

    const { id } = req.params;
    await prisma.singerSongKey.delete({ where: { id } });

    res.status(204).send();
  } catch (err: any) {
    logger.error({ err }, 'Error deleting singer song key:');

    if (err.code === "P2025") {
      return res.status(404).json({ error: { message: "Singer song key not found" } });
    }

    res.status(500).json({ error: { message: "Could not delete singer song key" } });
  }
};

/**
 * GET /users/:id/key-profile
 * Get a user's complete key profile (all songs and keys)
 */
export const getUserKeyProfile = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: { message: "User not found" } });
    }

    // Get all singer-song-keys for this user
    const keys = await prisma.singerSongKey.findMany({
      where: { singerId: id },
      orderBy: [{ songId: "asc" }, { serviceDate: "desc" }],
      include: {
        song: { select: { id: true, title: true, artist: true } },
      },
    });

    // Group by song for easy display
    const songMap = new Map<
      string,
      {
        song: { id: string; title: string; artist: string | null };
        entries: Array<{
          id: string;
          key: string;
          serviceDate: Date;
          notes: string | null;
        }>;
        mostRecentKey: string;
      }
    >();

    for (const entry of keys) {
      const songId = entry.song.id;
      if (!songMap.has(songId)) {
        songMap.set(songId, {
          song: entry.song,
          entries: [],
          mostRecentKey: entry.key,
        });
      }
      songMap.get(songId)!.entries.push({
        id: entry.id,
        key: entry.key,
        serviceDate: entry.serviceDate,
        notes: entry.notes,
      });
    }

    res.json({ data: Array.from(songMap.values()) });
  } catch (err) {
    logger.error({ err }, 'Error fetching user key profile:');
    res.status(500).json({ error: { message: "Could not fetch user key profile" } });
  }
};
