import { Request, Response, NextFunction } from 'express';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Middleware to validate UUID format in route parameters
 * @param paramName - The name of the parameter to validate (default: 'id')
 */
export const validateUuid = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuid = req.params[paramName];

    if (!uuid || !UUID_REGEX.test(uuid)) {
      return res.status(400).json({
        error: `Invalid UUID format for parameter '${paramName}'`
      });
    }

    next();
  };
};
