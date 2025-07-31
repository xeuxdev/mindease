import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { prisma } from "../config/database";
import { env } from "@/config/env";

interface ErrorWithStatus extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = async (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error to database and file
  try {
    await prisma.errorLog.create({
      data: {
        error: err.message,
        stack: err.stack || "",
        context: {
          method: req.method,
          url: req.url,
          body: req.body,
          query: req.query,
          params: req.params,
          headers: req.headers,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (dbError) {
    logger.error("Failed to log error to database:", dbError);
  }

  // Log to winston
  logger.error("API Error:", {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Don't leak error details in production
  const message =
    env.NODE_ENV === "production" && statusCode === 500
      ? "Internal Server Error"
      : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
    ...(env.NODE_ENV === "development" && {
      stack: err.stack,
      details: {
        method: req.method,
        url: req.url,
      },
    }),
  });
};
