import { Router, Request, Response, NextFunction } from "express";
import { query } from "express-validator";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";

const router = Router();

// Admin middleware to check if user has admin privileges
const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // In a real application, you would check user roles from the database
  // For now, we'll use a simple environment variable check
  const adminSecret = req.headers["x-admin-secret"];

  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  return next();
};

router.use(adminMiddleware);

// Get system statistics
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await prisma.$transaction(async (tx) => {
      const totalUsers = await tx.user.count();
      const anonymousUsers = await tx.user.count({
        where: { isAnonymous: true },
      });
      const registeredUsers = await tx.user.count({
        where: { isAnonymous: false },
      });

      const totalConversations = await tx.conversation.count();
      const activeConversations = await tx.conversation.count({
        where: { isActive: true },
      });

      const totalMessages = await tx.message.count();
      const todayMessages = await tx.message.count({
        where: {
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });

      const totalTokens = await tx.apiUsage.aggregate({
        _sum: { tokens: true },
      });

      const totalCost = await tx.apiUsage.aggregate({
        _sum: { cost: true },
      });

      const recentErrors = await tx.errorLog.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      return {
        users: {
          total: totalUsers,
          anonymous: anonymousUsers,
          registered: registeredUsers,
        },
        conversations: {
          total: totalConversations,
          active: activeConversations,
        },
        messages: {
          total: totalMessages,
          today: todayMessages,
        },
        apiUsage: {
          totalTokens: totalTokens._sum.tokens || 0,
          totalCost: totalCost._sum.cost || 0,
        },
        errors: {
          recent: recentErrors,
        },
      };
    });

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    logger.error("Failed to get admin stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get statistics",
    });
  }
});

// Get system logs
router.get(
  "/logs",
  [
    query("level").optional().isIn(["ERROR", "WARN", "INFO", "DEBUG"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const level = req.query.level as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const whereClause: any = {};
      if (level) {
        whereClause.level = level;
      }

      const logs = await prisma.systemLog.findMany({
        where: whereClause,
        orderBy: { timestamp: "desc" },
        skip: offset,
        take: limit,
      });

      const total = await prisma.systemLog.count({
        where: whereClause,
      });

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Failed to get logs:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get logs",
      });
    }
  }
);

// Get error logs
router.get(
  "/errors",
  [
    query("resolved").optional().isBoolean(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const resolved = req.query.resolved === "true";
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const whereClause: any = {};
      if (req.query.resolved !== undefined) {
        whereClause.resolved = resolved;
      }

      const errors = await prisma.errorLog.findMany({
        where: whereClause,
        orderBy: { timestamp: "desc" },
        skip: offset,
        take: limit,
      });

      const total = await prisma.errorLog.count({
        where: whereClause,
      });

      return res.json({
        success: true,
        data: {
          errors,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Failed to get error logs:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get error logs",
      });
    }
  }
);

// Mark error as resolved
router.patch(
  "/errors/:errorId/resolve",
  async (req: Request, res: Response) => {
    try {
      const { errorId } = req.params;

      const errorLog = await prisma.errorLog.update({
        where: { id: errorId },
        data: {
          resolved: true,
          resolvedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        data: { errorLog },
      });
    } catch (error) {
      logger.error("Failed to resolve error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to resolve error",
      });
    }
  }
);

// Get API usage analytics
router.get(
  "/usage",
  [
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
  ],
  async (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days

      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const usage = await prisma.apiUsage.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { timestamp: "desc" },
      });

      // Aggregate data
      const analytics = {
        totalRequests: usage.length,
        totalTokens: usage.reduce((sum, u) => sum + (u.tokens || 0), 0),
        totalCost: usage.reduce((sum, u) => sum + Number(u.cost || 0), 0),
        averageResponseTime:
          usage.length > 0
            ? usage.reduce((sum, u) => sum + (u.responseTime || 0), 0) /
              usage.length
            : 0,
        endpointBreakdown: usage.reduce((acc: any, u) => {
          acc[u.endpoint] = (acc[u.endpoint] || 0) + 1;
          return acc;
        }, {}),
      };

      return res.json({
        success: true,
        data: {
          analytics,
          rawData: usage,
          period: {
            startDate,
            endDate,
          },
        },
      });
    } catch (error) {
      logger.error("Failed to get usage analytics:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get usage analytics",
      });
    }
  }
);

export default router;
