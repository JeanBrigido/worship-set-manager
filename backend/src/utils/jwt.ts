import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
const DEFAULT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

/**
 * Sign a JWT token with default options.
 */
export function signToken(payload: object, options?: SignOptions): string {
  return jwt.sign(payload, JWT_SECRET, {
    ...options,
    expiresIn: (options?.expiresIn ?? DEFAULT_EXPIRES_IN) as any, // 👈 cast avoids TS issues
  });
}

/**
 * Verify a JWT token and return the decoded payload.
 */
export function verifyToken<T>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}
