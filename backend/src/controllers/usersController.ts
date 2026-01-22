import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import prisma from "../prisma";
import { Role } from "@prisma/client"; // import enum
import { signToken } from "../utils/jwt";
import logger from "../utils/logger";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * POST /users/signup
 */
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name, phoneE164 } = req.body;
    // Note: roles intentionally not accepted from request body to prevent privilege escalation
    // New users are always assigned the 'musician' role by default

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phoneE164,
        roles: [Role.musician], // Default role - admins must manually elevate privileges
      },
    });

    res.status(201).json({ data: { id: user.id, email: user.email, name: user.name } });
  } catch (err: any) {
    // Handle unique constraint violation (duplicate email) without revealing specifics
    if (err.code === 'P2002') {
      logger.info({ email: req.body.email }, 'Signup attempt with existing email');
      return res.status(400).json({ error: { message: "Unable to create account. Please try a different email address." } });
    }
    logger.error({ err }, 'Signup failed');
    res.status(500).json({ error: { message: "Could not create user" } });
  }
};


/**
 * POST /users/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    const token = signToken({ userId: user.id, roles: user.roles });

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          roles: user.roles,
          name: user.name,
        },
      }
    });
  } catch (err) {
    logger.error({ err }, 'Login failed');
    res.status(500).json({ error: { message: "Login failed" } });
  }
};



/**
 * GET /users/me
 */
export const getMe = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { message: "Unauthorized" } });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ error: { message: "User not found" } });
    }

    res.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneE164: user.phoneE164,
        roles: user.roles,
      }
    });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not fetch user" } });
  }
};

/**
 * GET /users
 * Admin only (or leader for limited data)
 * Query params:
 * - role: Filter by single role (e.g., "musician")
 * - roles: Filter by multiple roles (comma-separated, e.g., "musician,leader")
 * - isActive: Filter by active status (default: all)
 */
export const listUsers = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    // Allow admins and leaders to list users (leaders need this for assignments)
    if (!req.user?.roles.includes(Role.admin) && !req.user?.roles.includes(Role.leader)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    // Build where clause for filtering
    const where: any = {};

    // Filter by role(s)
    const roleParam = req.query.role as string;
    const rolesParam = req.query.roles as string;

    if (roleParam) {
      // Single role filter
      where.roles = { has: roleParam as Role };
    } else if (rolesParam) {
      // Multiple roles filter (OR condition)
      const roleList = rolesParam.split(',').map(r => r.trim()) as Role[];
      where.roles = { hasSome: roleList };
    }

    // Filter by active status
    const isActiveParam = req.query.isActive;
    if (isActiveParam !== undefined) {
      where.isActive = isActiveParam === 'true';
    }

    // Filter by instrument capability
    const instrumentIdParam = req.query.instrumentId as string;
    if (instrumentIdParam) {
      where.userInstruments = {
        some: { instrumentId: instrumentIdParam }
      };
    }

    // Check if we should include instruments in response
    const includeInstruments = req.query.includeInstruments === 'true';

    const users = await prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
      include: includeInstruments ? {
        userInstruments: {
          include: {
            instrument: {
              select: {
                id: true,
                code: true,
                displayName: true,
              }
            }
          }
        }
      } : undefined,
    });

    res.json({
      data: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        roles: u.roles,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        ...(includeInstruments && 'userInstruments' in u ? {
          instruments: (u as any).userInstruments.map((ui: any) => ({
            id: ui.instrument.id,
            code: ui.instrument.code,
            displayName: ui.instrument.displayName,
          }))
        } : {}),
      }))
    });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not list users" } });
  }
};

/**
 * POST /users
 * Admin creates user
 */
export const createUser = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { name, email, phoneE164, roles, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: { message: "Email already in use" } });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phoneE164,
        password: hash,
        roles: roles ?? [Role.musician],
      },
    });

    res.status(201).json({
      data: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      }
    });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not create user" } });
  }
};

/**
 * PUT /users/:id
 * Update user (Self or Admin)
 * Users can update their own profile (name, email, phoneE164)
 * Only admins can update roles
 */
export const updateUser = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: { message: "Unauthorized" } });
    }

    // Check if user is updating their own profile or is an admin
    const isOwnProfile = currentUser.userId === id;
    const isAdmin = currentUser.roles.includes(Role.admin);

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { name, email, phoneE164, roles, password } = req.body;

    const data: any = {};

    // All users can update these fields on their own profile
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phoneE164 !== undefined) data.phoneE164 = phoneE164;

    // Only admins can update roles
    if (roles !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({ error: { message: "Only admins can update roles" } });
      }
      data.roles = roles;
    }

    // Only admins can update passwords (users should use password change endpoint)
    if (password !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({ error: { message: "Use password change endpoint to update password" } });
      }
      data.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
    });

    res.json({
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        phoneE164: updated.phoneE164,
        roles: updated.roles,
      }
    });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not update user" } });
  }
};

/**
 * GET /users/:id
 * Get user profile (Self/Admin)
 */
export const getUser = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: { message: "Unauthorized" } });
    }

    // Check if user is trying to access their own profile or is an admin
    if (currentUser.userId !== id && !currentUser.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phoneE164: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: { message: "User not found" } });
    }

    res.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneE164: user.phoneE164,
        roles: user.roles,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not fetch user" } });
  }
};

/**
 * DELETE /users/:id
 * Admin deletes user
 */
export const deleteUser = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { id } = req.params;

    await prisma.user.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not delete user" } });
  }
};

/**
 * PATCH /users/:id/active
 * Toggle user active status (Admin only)
 */
export const toggleUserActive = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    // Prevent deactivating yourself
    if (req.user?.userId === id && !isActive) {
      return res.status(400).json({ error: { message: 'You cannot deactivate yourself' } });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ data: user });
  } catch (err) {
    logger.error({ err }, 'Error toggling user active status');
    res.status(500).json({ error: { message: 'Failed to update user status' } });
  }
};

/**
 * PATCH /users/:id/roles
 * Quick role update (Admin only)
 */
export const updateUserRoles = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const { roles } = req.body;

    // Defensive check - should be caught by middleware but verify
    if (!req.user?.userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    // Defensive check - validate roles array
    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ error: { message: 'At least one role is required' } });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    // Prevent removing your own admin role
    if (req.user.userId === id && existingUser.roles.includes('admin') && !roles.includes('admin')) {
      return res.status(400).json({ error: { message: 'You cannot remove your own admin role' } });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { roles },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ data: user });
  } catch (error) {
    logger.error({ err: error }, 'Error updating user roles');
    res.status(500).json({ error: { message: 'Failed to update user roles' } });
  }
};

/**
 * GET /users/:id/song-progress
 * Get songs to practice for upcoming services (Self or Admin)
 * Includes services where user is assigned OR is the worship set leader
 * Query params:
 *   - upcoming: "true" to filter to future services only (default: true)
 */
export const getSongProgress = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: { message: "Unauthorized" } });
    }

    // Allow self or admin access
    if (currentUser.userId !== id && !currentUser.roles.includes(Role.admin)) {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const upcoming = req.query.upcoming !== 'false';

    // Build date filter for services
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Show services up to 24 hours after they've passed
    const cutoffDate = new Date(today);
    cutoffDate.setHours(-24, 0, 0, 0);

    const serviceFilter = upcoming ? { serviceDate: { gte: cutoffDate } } : undefined;

    // Get user's assignments to find services they're assigned to
    const assignments = await prisma.assignment.findMany({
      where: {
        userId: id,
        worshipSet: {
          service: serviceFilter
        }
      },
      include: {
        worshipSet: {
          include: {
            service: {
              include: {
                serviceType: true
              }
            },
            setSongs: {
              orderBy: { position: 'asc' },
              include: {
                songVersion: {
                  include: {
                    song: true,
                    chordSheet: { select: { id: true } },
                  }
                },
                singer: {
                  select: { id: true, name: true }
                },
                userProgress: {
                  where: { userId: id }
                }
              }
            }
          }
        }
      }
    });

    // Also get worship sets where user is the leader (even if not assigned)
    const leaderWorshipSets = await prisma.worshipSet.findMany({
      where: {
        leaderUserId: id,
        service: serviceFilter
      },
      include: {
        service: {
          include: {
            serviceType: true
          }
        },
        setSongs: {
          orderBy: { position: 'asc' },
          include: {
            songVersion: {
              include: {
                song: true,
                chordSheet: { select: { id: true } },
              }
            },
            singer: {
              select: { id: true, name: true }
            },
            userProgress: {
              where: { userId: id }
            }
          }
        }
      }
    });

    // Group songs by service
    const serviceMap = new Map<string, {
      service: any;
      songs: any[];
    }>();

    // Helper function to add songs from a worship set
    const addSongsFromWorshipSet = (ws: any) => {
      if (!ws?.service) return;

      const serviceId = ws.service.id;

      if (!serviceMap.has(serviceId)) {
        serviceMap.set(serviceId, {
          service: {
            id: ws.service.id,
            serviceDate: ws.service.serviceDate,
            serviceType: ws.service.serviceType,
          },
          songs: []
        });
      }

      // Add songs that haven't been added yet
      const existingSongIds = new Set(serviceMap.get(serviceId)!.songs.map((s: any) => s.setSong.id));

      for (const setSong of ws.setSongs) {
        if (existingSongIds.has(setSong.id)) continue;

        // Resolve YouTube URL (priority: override > version > song default)
        const youtubeUrl = setSong.youtubeUrlOverride
          || setSong.songVersion?.youtubeUrl
          || setSong.songVersion?.song?.defaultYoutubeUrl
          || null;

        const listened = setSong.userProgress.length > 0;
        const listenedAt = listened ? setSong.userProgress[0].listenedAt : null;

        serviceMap.get(serviceId)!.songs.push({
          setSong: {
            id: setSong.id,
            position: setSong.position,
            keyOverride: setSong.keyOverride,
          },
          songVersion: {
            id: setSong.songVersion.id,
            name: setSong.songVersion.name,
            youtubeUrl: setSong.songVersion.youtubeUrl,
            chordSheet: setSong.songVersion.chordSheet,
          },
          song: {
            id: setSong.songVersion.song.id,
            title: setSong.songVersion.song.title,
            artist: setSong.songVersion.song.artist,
            defaultYoutubeUrl: setSong.songVersion.song.defaultYoutubeUrl,
          },
          singer: setSong.singer,
          youtubeUrl,
          listened,
          listenedAt,
        });
      }
    };

    // Process assignments
    for (const assignment of assignments) {
      addSongsFromWorshipSet(assignment.worshipSet);
    }

    // Process leader worship sets
    for (const ws of leaderWorshipSets) {
      addSongsFromWorshipSet(ws);
    }

    // Convert to array and sort by service date
    const result = Array.from(serviceMap.values())
      .sort((a, b) => new Date(a.service.serviceDate).getTime() - new Date(b.service.serviceDate).getTime());

    res.json({ data: result });
  } catch (err) {
    logger.error({ err }, 'Operation failed');
    res.status(500).json({ error: { message: "Could not fetch song progress" } });
  }
};
