import { Request, Response, NextFunction } from "express";

/**
 * Cache control middleware factory
 *
 * @param maxAge - Cache duration in seconds (default: 0, no caching)
 * @param isPrivate - Whether the cache is private (user-specific data)
 */
export const cacheControl = (maxAge: number = 0, isPrivate: boolean = true) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (maxAge > 0) {
      const directive = isPrivate ? 'private' : 'public';
      res.setHeader('Cache-Control', `${directive}, max-age=${maxAge}`);
    } else {
      // No caching - for dynamic or sensitive data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  };
};

/**
 * Predefined cache policies
 */

// No caching - for user-specific or frequently changing data
export const noCache = cacheControl(0);

// Short cache - for semi-dynamic data (5 minutes)
export const shortCache = cacheControl(300, true);

// Medium cache - for reference data (15 minutes)
export const mediumCache = cacheControl(900, false);

// Long cache - for rarely changing data (1 hour)
export const longCache = cacheControl(3600, false);
