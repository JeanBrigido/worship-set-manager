import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /songs
 * Supports pagination, search, and sorting:
 * - page: page number (default: 1)
 * - limit: items per page (default: 50, max: 100)
 * - search: search in title and artist
 * - sortBy: field to sort by (title, artist, familiarityScore, createdAt)
 * - sortOrder: asc or desc (default: asc)
 */
export const listSongs = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const search = (req.query.search as string) || "";
    const sortBy = (req.query.sortBy as string) || "title";
    const sortOrder = (req.query.sortOrder as string) === "desc" ? "desc" : "asc";

    // Build where clause
    const where: any = { isActive: true };

    if (search.trim()) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { artist: { contains: search, mode: "insensitive" } },
      ];
    }

    // Validate sortBy field
    const allowedSortFields = ["title", "artist", "familiarityScore", "createdAt", "updatedAt"];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : "title";

    // Get total count for pagination
    const total = await prisma.song.count({ where });

    // Get paginated results
    const songs = await prisma.song.findMany({
      where,
      orderBy: { [orderByField]: sortOrder },
      include: { versions: true },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      data: songs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not list songs" } });
  }
};

/**
 * GET /songs/:id
 */
export const getSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const song = await prisma.song.findUnique({
      where: { id },
      include: {
        versions: {
          include: {
            chordSheet: {
              select: { id: true },
            },
          },
        },
      },
    });
    if (!song) return res.status(404).json({ error: { message: "Song not found" } });
    res.json({ data: song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch song" } });
  }
};

/**
 * POST /songs
 * Authorization handled by route middleware (admin, leader, musician)
 */
export const createSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { title, artist, ccliNumber, defaultYoutubeUrl, tags, language, familiarityScore } = req.body;

    const song = await prisma.song.create({
      data: {
        title,
        artist,
        ccliNumber,
        defaultYoutubeUrl,
        tags,
        language,
        familiarityScore: familiarityScore ?? 50,
      },
    });

    res.status(201).json({ data: song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not create song" } });
  }
};

/**
 * PUT /songs/:id
 * Authorization handled by route middleware (admin, leader, musician)
 */
export const updateSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const { title, artist, ccliNumber, defaultYoutubeUrl, tags, language, familiarityScore, isActive } = req.body;

    const updated = await prisma.song.update({
      where: { id },
      data: {
        title,
        artist,
        ccliNumber,
        defaultYoutubeUrl,
        tags,
        language,
        familiarityScore,
        isActive,
      },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not update song" } });
  }
};

/**
 * DELETE /songs/:id
 * Soft delete → mark inactive
 */
export const deleteSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;

    const updated = await prisma.song.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not delete song" } });
  }
};
