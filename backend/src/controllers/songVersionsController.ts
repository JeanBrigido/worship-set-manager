import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /songVersions/song/:songId
 */
export const listVersionsForSong = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { songId } = req.params;
    const versions = await prisma.songVersion.findMany({
      where: { songId },
      orderBy: { name: "asc" },
    });
    res.json({ data: versions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not list versions" } });
  }
};

/**
 * GET /songVersions/:id
 */
export const getVersion = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const version = await prisma.songVersion.findUnique({ where: { id } });
    if (!version) return res.status(404).json({ error: { message: "Song version not found" } });
    res.json({ data: version });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch song version" } });
  }
};

/**
 * POST /songVersions
 */
export const createVersion = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { songId, name, youtubeUrl, defaultKey, bpm, notes } = req.body;

    const version = await prisma.songVersion.create({
      data: { songId, name, youtubeUrl, defaultKey, bpm, notes },
    });

    res.status(201).json({ data: version });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not create version" } });
  }
};

/**
 * PUT /songVersions/:id
 */
export const updateVersion = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;
    const { name, youtubeUrl, defaultKey, bpm, notes } = req.body;

    const updated = await prisma.songVersion.update({
      where: { id },
      data: { name, youtubeUrl, defaultKey, bpm, notes },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not update version" } });
  }
};

/**
 * DELETE /songVersions/:id
 */
export const deleteVersion = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;

    await prisma.songVersion.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not delete version" } });
  }
};
