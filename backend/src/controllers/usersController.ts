import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import prisma from "../prisma";
import { Role } from "@prisma/client"; // import enum
import { signToken } from "../utils/jwt";

interface JwtPayload {
  userId: string;
  roles: Role[];
}

/**
 * POST /users/signup
 */
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name, phoneE164, roles } = req.body;

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phoneE164,
        roles,
      },
    });

    res.status(201).json({ data: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create user" });
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
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
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
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};



/**
 * GET /users/me
 */
export const getMe = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
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
    console.error(err);
    res.status(500).json({ error: "Could not fetch user" });
  }
};

/**
 * GET /users
 * Admin only
 */
export const listUsers = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const users = await prisma.user.findMany();

    res.json({
      data: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        roles: u.roles,
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not list users" });
  }
};

/**
 * POST /users
 * Admin creates user
 */
export const createUser = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { name, email, phoneE164, roles, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email already in use" });
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
    console.error(err);
    res.status(500).json({ error: "Could not create user" });
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
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if user is updating their own profile or is an admin
    const isOwnProfile = currentUser.userId === id;
    const isAdmin = currentUser.roles.includes(Role.admin);

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
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
        return res.status(403).json({ error: "Only admins can update roles" });
      }
      data.roles = roles;
    }

    // Only admins can update passwords (users should use password change endpoint)
    if (password !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({ error: "Use password change endpoint to update password" });
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
    console.error(err);
    res.status(500).json({ error: "Could not update user" });
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
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if user is trying to access their own profile or is an admin
    if (currentUser.userId !== id && !currentUser.roles.includes(Role.admin)) {
      return res.status(403).json({ error: "Forbidden" });
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
      return res.status(404).json({ error: "User not found" });
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
    console.error(err);
    res.status(500).json({ error: "Could not fetch user" });
  }
};

/**
 * DELETE /users/:id
 * Admin deletes user
 */
export const deleteUser = async (req: Request & { user?: JwtPayload }, res: Response) => {
  try {
    if (!req.user?.roles.includes(Role.admin)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;

    await prisma.user.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete user" });
  }
};
