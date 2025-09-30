import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";
import { jwtConfig } from "../config/env";

interface JwtPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        sessionId: string;
        isAnonymous: boolean;
        email?: string;
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // Extract the token from the Authorization header
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;

    // Check if session exists and is valid
    const session = await prisma.session.findUnique({
      where: {
        id: decoded.sessionId,
        token: token,
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({
        where: { id: session.id },
      });

      return res.status(401).json({
        success: false,
        message: "Session expired",
      });
    }

    // Attach user to request
    req.user = {
      id: session.user.id,
      sessionId: session.id,
      isAnonymous: session.user.isAnonymous,
      email: session.user.email || undefined,
    };

    logger.debug("User authenticated", {
      userId: req.user.id,
      sessionId: req.user.sessionId,
      isAnonymous: req.user.isAnonymous,
      correlationId: req.correlationId,
    });

    return next();
  } catch (error) {
    logger.error("Authentication error:", error);

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};
