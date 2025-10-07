import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /songs
 */
export const listSongs = async (_req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const songs = await prisma.song.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      include: { versions: true },
    });
    res.json({ data: songs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not list songs" });
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
      include: { versions: true },
    });
    if (!song) return res.status(404).json({ error: "Song not found" });
    res.json({ data: song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch song" });
  }
};

/**
 * POST /songs
 */
export const createSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: "Forbidden" });
    }

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
    res.status(500).json({ error: "Could not create song" });
  }
};

/**
 * PUT /songs/:id
 */
export const updateSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: "Forbidden" });
    }

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
    res.status(500).json({ error: "Could not update song" });
  }
};

/**
 * DELETE /songs/:id
 * Soft delete → mark inactive
 */
export const deleteSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;

    const updated = await prisma.song.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete song" });
  }
};
