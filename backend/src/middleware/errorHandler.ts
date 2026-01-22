import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.status || err.statusCode || 500;
  const isServerError = statusCode >= 500;

  // Log with appropriate level and context
  const logContext = {
    err: isServerError ? err : undefined,
    errorMessage: err.message,
    statusCode,
    method: req.method,
    url: req.url,
    userId: (req as any).user?.userId,
  };

  if (isServerError) {
    logger.error(logContext, "Server error");
  } else {
    logger.warn(logContext, "Client error");
  }

  res.status(statusCode).json({
    error: {
      message: isServerError ? "Internal Server Error" : (err.message || "An error occurred"),
    },
  });
};
