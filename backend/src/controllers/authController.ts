import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { sendPasswordResetEmail } from '../services/email';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * POST /users/forgot-password
 * Request a password reset email
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Always return success to prevent email enumeration
    const successResponse = {
      message: 'If an account exists with this email, we have sent a reset link.',
    };

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal that the user doesn't exist
      return res.json(successResponse);
    }

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Delete any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new token (expires in 1 hour)
    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Send email with raw token (user will send this back)
    const resetUrl = `${APP_URL}/auth/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    res.json(successResponse);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: { message: 'Failed to process request' } });
  }
};

/**
 * POST /users/reset-password
 * Reset password with token
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!resetToken) {
      return res.status(400).json({ error: { message: 'Invalid or expired reset link' } });
    }

    if (resetToken.usedAt) {
      return res.status(400).json({ error: { message: 'This reset link has already been used' } });
    }

    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: { message: 'This reset link has expired' } });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: { message: 'Failed to reset password' } });
  }
};
