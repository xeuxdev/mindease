import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// Extend Express Request type to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
    }
  }
}

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate correlation ID for request tracking
  req.correlationId = crypto.randomUUID();
  req.startTime = Date.now();

  // Log incoming request
  logger.info("Incoming Request", {
    correlationId: req.correlationId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function (body: any) {
    const duration = Date.now() - (req.startTime || 0);

    logger.info("Outgoing Response", {
      correlationId: req.correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return originalJson.call(this, body);
  };

  next();
};
