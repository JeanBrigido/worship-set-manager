import { Request, Response } from "express";
import logger from "../utils/logger";
import prisma from "../prisma";
import { Role } from "@prisma/client";
import { RRule } from "rrule";

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
    logger.error({ err }, 'Operation failed');
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
    logger.error({ err }, 'Operation failed');
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
    logger.error({ err }, 'Operation failed');
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
    logger.error({ err }, 'Operation failed');
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
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not delete service type" } });
  }
};

/**
 * POST /serviceTypes/:id/generate-services
 * Generate services for the year based on the RRULE
 */
export const generateServices = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;
    const { year } = req.body;
    const targetYear = year || new Date().getFullYear();

    // Get the service type
    const serviceType = await prisma.serviceType.findUnique({
      where: { id },
    });

    if (!serviceType) {
      return res.status(404).json({ error: { message: "Service type not found" } });
    }

    if (!serviceType.rrule) {
      return res.status(400).json({ error: { message: "Service type does not have a recurrence rule (RRULE)" } });
    }

    // Parse the RRULE and generate dates for the year
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

    let rule: RRule;
    try {
      // Parse RRULE string - add DTSTART if not present
      const rruleString = serviceType.rrule.includes('DTSTART')
        ? serviceType.rrule
        : `DTSTART:${startOfYear.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n${serviceType.rrule}`;

      rule = RRule.fromString(rruleString);
    } catch (parseErr) {
      logger.warn({ err: parseErr }, 'RRULE parse error');
      return res.status(400).json({ error: { message: "Invalid RRULE format" } });
    }

    // Generate all occurrences for the year
    const dates = rule.between(startOfYear, endOfYear, true);

    if (dates.length === 0) {
      return res.status(400).json({ error: { message: "No dates generated from RRULE for the specified year" } });
    }

    // Get existing services for this service type in this year
    const existingServices = await prisma.service.findMany({
      where: {
        serviceTypeId: id,
        serviceDate: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      select: { serviceDate: true },
    });

    // Create a set of existing dates for quick lookup (normalize to date string)
    const existingDates = new Set(
      existingServices.map(s => s.serviceDate.toISOString().split('T')[0])
    );

    // Filter out dates that already have services
    const newDates = dates.filter(date => {
      const dateStr = date.toISOString().split('T')[0];
      return !existingDates.has(dateStr);
    });

    if (newDates.length === 0) {
      return res.json({
        data: {
          created: 0,
          skipped: dates.length,
          message: "All services for this year already exist"
        }
      });
    }

    // Get leader rotations for this service type
    const rotations = await prisma.leaderRotation.findMany({
      where: {
        serviceTypeId: id,
        isActive: true,
      },
      orderBy: { rotationOrder: 'asc' },
    });

    // Find the starting point in the rotation based on most recent service with a leader
    let rotationIndex = 0;
    if (rotations.length > 0) {
      const lastServiceWithLeader = await prisma.service.findFirst({
        where: {
          serviceTypeId: id,
          worshipSet: {
            leaderUserId: { not: null }
          }
        },
        include: {
          worshipSet: { select: { leaderUserId: true } }
        },
        orderBy: { serviceDate: 'desc' }
      });

      if (lastServiceWithLeader?.worshipSet?.leaderUserId) {
        const lastLeaderIndex = rotations.findIndex(
          r => r.userId === lastServiceWithLeader.worshipSet?.leaderUserId
        );
        if (lastLeaderIndex !== -1) {
          // Start from the next leader in rotation
          rotationIndex = (lastLeaderIndex + 1) % rotations.length;
        }
      }
    }

    // Sort new dates chronologically for consistent rotation assignment
    newDates.sort((a, b) => a.getTime() - b.getTime());

    // Create services for new dates with associated WorshipSets and auto-assigned leaders
    const createdServices = await prisma.$transaction(
      newDates.map((date, index) => {
        // Calculate which leader should be assigned to this service
        const leaderUserId = rotations.length > 0
          ? rotations[(rotationIndex + index) % rotations.length].userId
          : null;

        return prisma.service.create({
          data: {
            serviceDate: date,
            serviceTypeId: id,
            worshipSet: {
              create: {
                status: "draft",
                leaderUserId,
              }
            }
          },
          include: {
            serviceType: true,
            worshipSet: {
              include: {
                leaderUser: {
                  select: { id: true, name: true, email: true }
                }
              }
            },
          }
        });
      })
    );

    res.status(201).json({
      data: {
        created: createdServices.length,
        skipped: dates.length - newDates.length,
        year: targetYear,
        leadersAssigned: rotations.length > 0,
        services: createdServices
      }
    });
  } catch (err) {
    logger.error({ err }, 'Error generating services:');
    res.status(500).json({ error: { message: "Could not generate services" } });
  }
};
