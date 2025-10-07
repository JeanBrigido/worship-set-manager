import { Request, Response } from "express";
import prisma from "../prisma";

/**
 * Get all instruments
 */
export const getAllInstruments = async (req: Request, res: Response) => {
  try {
    const instruments = await prisma.instrument.findMany({
      orderBy: {
        displayName: 'asc'
      }
    });

    res.json({ data: instruments });
  } catch (error) {
    console.error("Error fetching instruments:", error);
    res.status(500).json({
      error: { message: "Failed to fetch instruments" }
    });
  }
};

/**
 * Get instrument by ID
 */
export const getInstrumentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const instrument = await prisma.instrument.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            user: true,
            worshipSet: {
              include: {
                service: {
                  include: {
                    serviceType: true
                  }
                }
              }
            }
          }
        },
        defaultAssignments: {
          include: {
            serviceType: true,
            user: true
          }
        }
      }
    });

    if (!instrument) {
      return res.status(404).json({
        error: { message: "Instrument not found" }
      });
    }

    res.json({ data: instrument });
  } catch (error) {
    console.error("Error fetching instrument:", error);
    res.status(500).json({
      error: { message: "Failed to fetch instrument" }
    });
  }
};

/**
 * Create new instrument (Admin only)
 */
export const createInstrument = async (req: Request, res: Response) => {
  try {
    const { code, displayName, maxPerSet } = req.body;

    const instrument = await prisma.instrument.create({
      data: {
        code,
        displayName,
        maxPerSet: parseInt(maxPerSet)
      }
    });

    res.status(201).json({ data: instrument });
  } catch (error: any) {
    console.error("Error creating instrument:", error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        error: { message: "An instrument with this code already exists" }
      });
    }

    res.status(500).json({
      error: { message: "Failed to create instrument" }
    });
  }
};

/**
 * Update instrument (Admin only)
 */
export const updateInstrument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, displayName, maxPerSet } = req.body;

    const instrument = await prisma.instrument.update({
      where: { id },
      data: {
        code,
        displayName,
        maxPerSet: parseInt(maxPerSet)
      }
    });

    res.json({ data: instrument });
  } catch (error: any) {
    console.error("Error updating instrument:", error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        error: { message: "An instrument with this code already exists" }
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: { message: "Instrument not found" }
      });
    }

    res.status(500).json({
      error: { message: "Failed to update instrument" }
    });
  }
};

/**
 * Delete instrument (Admin only)
 */
export const deleteInstrument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.instrument.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting instrument:", error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: { message: "Instrument not found" }
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: { message: "Cannot delete instrument that has assignments or default assignments" }
      });
    }

    res.status(500).json({
      error: { message: "Failed to delete instrument" }
    });
  }
};