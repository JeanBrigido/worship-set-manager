import { Request, Response } from "express";
import prisma from "../prisma";
import { Role, ServiceStatus } from "@prisma/client";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * GET /services
 */
export const listServices = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: { serviceDate: "asc" },
      include: {
        serviceType: true,
        worshipSet: {
          include: {
            _count: {
              select: { setSongs: true }
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
            setSongs: {
              include: {
                songVersion: {
                  include: {
                    song: true
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
    const { date, serviceTypeId, service_type_id, status, leaderId, leader_id } = req.body;
    const typeId = serviceTypeId || service_type_id;
    const leaderUserId = leaderId || leader_id;

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
        worshipSet: true,
      },
    });

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
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;

    await prisma.service.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete service" });
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
      return res.status(404).json({ error: "Service not found" });
    }

    // Return assignments from the worship set
    const assignments = service.worshipSet?.assignments || [];
    res.json({ data: assignments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch service assignments" });
  }
};

/**
 * PUT /services/:id/assignments
 */
export const updateServiceAssignments = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: "Forbidden" });
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
      return res.status(404).json({ error: "Service not found" });
    }

    if (!service.worshipSet) {
      return res.status(400).json({ error: "Service does not have a worship set" });
    }

    const setId = service.worshipSet.id;

    // Process assignments in a transaction
    await prisma.$transaction(async (tx) => {
      // First, delete existing assignments for this worship set
      await tx.assignment.deleteMany({
        where: { setId }
      });

      // Then create new assignments from the Record<instrumentId, userId> format
      for (const instrumentId in assignments) {
        const userId = assignments[instrumentId];
        if (userId && typeof userId === 'string' && userId.trim() !== '' && instrumentId) {
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
    res.status(500).json({ error: "Could not update service assignments" });
  }
};
