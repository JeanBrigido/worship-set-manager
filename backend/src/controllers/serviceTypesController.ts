import { Request, Response } from "express";
import prisma from "../prisma";
import { Role } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /serviceTypes
 */
export const listServiceTypes = async (_req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const serviceTypes = await prisma.serviceType.findMany({
      orderBy: { name: "asc" },
      include: {
        defaultAssignments: {
          include: {
            instrument: true
          }
        }
      }
    });
    res.json({ data: serviceTypes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not list service types" } });
  }
};

/**
 * GET /serviceTypes/:id
 */
export const getServiceType = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const serviceType = await prisma.serviceType.findUnique({
      where: { id },
      include: {
        defaultAssignments: {
          include: {
            instrument: true
          }
        }
      }
    });
    if (!serviceType) return res.status(404).json({ error: { message: "Service type not found" } });
    res.json({ data: serviceType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch service type" } });
  }
};

/**
 * POST /serviceTypes
 */
export const createServiceType = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { name, defaultStartTime, rrule } = req.body;

    const serviceType = await prisma.serviceType.create({
      data: { name, defaultStartTime, rrule },
    });

    res.status(201).json({ data: serviceType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not create service type" } });
  }
};

/**
 * PUT /serviceTypes/:id
 */
export const updateServiceType = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;
    const { name, defaultStartTime, rrule } = req.body;

    const updated = await prisma.serviceType.update({
      where: { id },
      data: { name, defaultStartTime, rrule },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not update service type" } });
  }
};

/**
 * DELETE /serviceTypes/:id
 */
export const deleteServiceType = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;
    await prisma.serviceType.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not delete service type" } });
  }
};
