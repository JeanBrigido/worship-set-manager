import { Request, Response } from "express";
import prisma from "../prisma";
import { Role, ServiceStatus } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /services
 * Query params:
 *   - upcoming: "true" to filter to future services only (serviceDate >= start of today)
 *   - limit: number of results to return
 *   - startDate: ISO date string to filter services from this date (inclusive)
 *   - endDate: ISO date string to filter services until this date (inclusive)
 */
export const listServices = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { upcoming, limit, startDate, endDate } = req.query;

    // Build where clause
    const where: { serviceDate?: { gte?: Date; lte?: Date } } = {};

    if (upcoming === "true") {
      // Filter to services from today onwards (start of day in UTC)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.serviceDate = { gte: today };
    } else if (startDate || endDate) {
      // Filter by date range
      where.serviceDate = {};
      if (startDate) {
        where.serviceDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.serviceDate.lte = new Date(endDate as string);
      }
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: { serviceDate: "asc" },
      take: limit ? parseInt(limit as string) : undefined,
      include: {
        serviceType: true,
        leader: {
          select: {
            id: true,
            name: true,
          }
        },
        worshipSet: {
          select: {
            id: true,
            status: true,
            leaderUserId: true,
            leaderUser: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            _count: {
              select: { setSongs: true }
            },
            assignments: {
              select: {
                id: true,
                user: {
                  select: { name: true }
                },
                instrument: {
                  select: { displayName: true }
                }
              }
            }
          }
        },
      },
    });
    res.json({ data: services });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not list services" } });
  }
};

/**
 * GET /services/:id
 */
export const getService = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        serviceType: true,
        leader: true,
        worshipSet: {
          include: {
            leaderUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            setSongs: {
              include: {
                songVersion: {
                  include: {
                    song: true
                  }
                },
                singer: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              },
              orderBy: {
                position: 'asc'
              }
            },
            assignments: {
              include: {
                user: true,
                instrument: true
              }
            }
          }
        }
      },
    });
    if (!service) return res.status(404).json({ error: { message: "Service not found" } });
    res.json({ data: service });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch service" } });
  }
};

/**
 * POST /services
 */
export const createService = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    // Accept both camelCase and snake_case field names for flexibility
    const { date, serviceTypeId, service_type_id, notes } = req.body;
    const typeId = serviceTypeId || service_type_id;

    if (!date) {
      return res.status(400).json({
        error: { message: "Date is required" }
      });
    }

    if (!typeId) {
      return res.status(400).json({
        error: { message: "Service type ID is required" }
      });
    }

    // Check for unique constraint (serviceTypeId + date)
    const existingService = await prisma.service.findFirst({
      where: {
        serviceTypeId: typeId,
        serviceDate: new Date(date),
      },
    });

    if (existingService) {
      return res.status(400).json({
        error: { message: "A service of this type already exists for the specified date" }
      });
    }

    // Create service with associated WorshipSet in draft status
    const service = await prisma.service.create({
      data: {
        serviceDate: new Date(date),
        serviceTypeId: typeId,
        worshipSet: {
          create: {
            status: "draft",
            notes,
          }
        }
      },
      include: {
        serviceType: true,
        worshipSet: true,
      },
    });

    res.status(201).json({ data: service });
  } catch (err: any) {
    console.error("Error creating service:", err);
    res.status(500).json({ error: { message: "Could not create service" } });
  }
};

/**
 * PUT /services/:id
 */
export const updateService = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;
    // Accept both camelCase and snake_case
    const { date, serviceTypeId, service_type_id, status, leaderId, leader_id, worshipSetLeaderId, worship_set_leader_id } = req.body;
    const typeId = serviceTypeId || service_type_id;
    const leaderUserId = leaderId || leader_id;
    const worshipLeaderId = worshipSetLeaderId || worship_set_leader_id;

    // Build update data object, only including fields that are provided
    const updateData: {
      serviceDate?: Date;
      serviceTypeId?: string;
      status?: ServiceStatus;
      leaderId?: string | null;
    } = {};

    if (date) {
      updateData.serviceDate = new Date(date);
    }
    if (typeId) {
      updateData.serviceTypeId = typeId;
    }
    if (status && Object.values(ServiceStatus).includes(status)) {
      updateData.status = status;
    }
    // Allow setting leaderId to null to unassign leader
    if (leaderUserId !== undefined) {
      updateData.leaderId = leaderUserId || null;
    }

    const updated = await prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        serviceType: true,
        leader: true,
        worshipSet: {
          include: {
            leaderUser: {
              select: { id: true, name: true, email: true }
            }
          }
        },
      },
    });

    // Update worship set leader if provided (manual override - does not affect rotation)
    if (worshipLeaderId !== undefined && updated.worshipSet) {
      await prisma.worshipSet.update({
        where: { id: updated.worshipSet.id },
        data: { leaderUserId: worshipLeaderId || null }
      });

      // Re-fetch to get updated worship set with leader
      const refreshed = await prisma.service.findUnique({
        where: { id },
        include: {
          serviceType: true,
          leader: true,
          worshipSet: {
            include: {
              leaderUser: {
                select: { id: true, name: true, email: true }
              }
            }
          },
        },
      });

      return res.json({ data: refreshed });
    }

    res.json({ data: updated });
  } catch (err: any) {
    console.error("Error updating service:", err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: "Service not found" } });
    }
    res.status(500).json({ error: { message: "Could not update service" } });
  }
};

/**
 * DELETE /services/:id
 */
export const deleteService = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;

    await prisma.service.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not delete service" } });
  }
};

/**
 * GET /services/:id/assignments
 */
export const getServiceAssignments = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;

    // First get the service to ensure it exists
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        worshipSet: {
          include: {
            assignments: {
              include: {
                user: true,
                instrument: true
              }
            }
          }
        }
      }
    });

    if (!service) {
      return res.status(404).json({ error: { message: "Service not found" } });
    }

    // Return assignments from the worship set
    const assignments = service.worshipSet?.assignments || [];
    res.json({ data: assignments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not fetch service assignments" } });
  }
};

/**
 * PUT /services/:id/assignments
 */
export const updateServiceAssignments = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;
    const { assignments } = req.body as { assignments: Record<string, string> }; // Expected format: Record<string, string> (instrumentId -> userId)

    // First get the service and its worship set
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        worshipSet: true
      }
    });

    if (!service) {
      return res.status(404).json({ error: { message: "Service not found" } });
    }

    if (!service.worshipSet) {
      return res.status(400).json({ error: { message: "Service does not have a worship set" } });
    }

    const setId = service.worshipSet.id;

    // Process assignments in a transaction - only update instruments that are passed
    await prisma.$transaction(async (tx) => {
      for (const instrumentId in assignments) {
        const userId = assignments[instrumentId];

        // Delete existing assignment for this specific instrument
        await tx.assignment.deleteMany({
          where: { setId, instrumentId }
        });

        // Create new assignment if userId is provided (not empty)
        if (userId && typeof userId === 'string' && userId.trim() !== '') {
          await tx.assignment.create({
            data: {
              setId,
              instrumentId,
              userId,
              status: 'invited',
              invitedAt: new Date()
            }
          });
        }
      }
    });

    // Fetch and return updated assignments
    const updatedAssignments = await prisma.assignment.findMany({
      where: { setId },
      include: {
        user: true,
        instrument: true
      }
    });

    res.json({ data: updatedAssignments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Could not update service assignments" } });
  }
};
