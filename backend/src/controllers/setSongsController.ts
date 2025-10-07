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

    const song = await prisma.setSong.create({
      data: {
        setId,
        songVersionId,
        position,
        keyOverride,
        youtubeUrlOverride,
        isNew: isNew ?? false,
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

    await prisma.setSong.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete set song" });
  }
};
