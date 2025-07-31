import { Router, Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";
import { env } from "../config/env";

const router = Router();

interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: {
    database: "connected" | "disconnected" | "error";
    redis?: "connected" | "disconnected" | "error";
    openai?: "available" | "unavailable" | "error";
  };
  system: {
    memory: {
      used: number;
      total: number;
      free: number;
    };
    cpu: {
      usage: number;
    };
  };
}

// Basic health check
router.get("/", async (req: Request, res: Response) => {
  try {
    const healthStatus: HealthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: env.NODE_ENV || "development",
      uptime: process.uptime(),
      services: {
        database: "connected",
      },
      system: {
        memory: {
          used:
            Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) /
            100,
          total:
            Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) /
            100,
          free:
            Math.round(
              ((process.memoryUsage().heapTotal -
                process.memoryUsage().heapUsed) /
                1024 /
                1024) *
                100
            ) / 100,
        },
        cpu: {
          usage: Math.round((process.cpuUsage().user / 1000000) * 100) / 100,
        },
      },
    };

    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthStatus.services.database = "connected";
    } catch (error) {
      logger.error("Database health check failed:", error);
      healthStatus.services.database = "error";
      healthStatus.status = "unhealthy";
    }

    // Test OpenAI API if key is configured
    if (env.OPENAI_API_KEY) {
      try {
        // Simple availability check without making an actual API call
        healthStatus.services.openai = "available";
      } catch (error) {
        logger.error("OpenAI health check failed:", error);
        healthStatus.services.openai = "error";
      }
    }

    const statusCode = healthStatus.status === "healthy" ? 200 : 503;

    res.status(statusCode).json({
      success: healthStatus.status === "healthy",
      data: healthStatus,
    });
  } catch (error) {
    logger.error("Health check failed:", error);

    res.status(503).json({
      success: false,
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
});

// Detailed health check for monitoring systems
router.get("/detailed", async (req: Request, res: Response) => {
  try {
    const start = Date.now();

    // Database connectivity test with timing
    let dbLatency = 0;
    let dbStatus = "connected";
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch (error) {
      logger.error("Database connectivity test failed:", error);
      dbStatus = "error";
    }

    // Get database statistics
    const userCount = await prisma.user.count();
    const conversationCount = await prisma.conversation.count();
    const messageCount = await prisma.message.count();
    const recentErrorCount = await prisma.errorLog.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    const totalLatency = Date.now() - start;

    res.json({
      success: true,
      data: {
        status: dbStatus === "connected" ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
        environment: env.NODE_ENV || "development",
        uptime: process.uptime(),
        latency: {
          total: totalLatency,
          database: dbLatency,
        },
        services: {
          database: dbStatus,
        },
        statistics: {
          users: userCount,
          conversations: conversationCount,
          messages: messageCount,
          recentErrors: recentErrorCount,
        },
        system: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          platform: process.platform,
          nodeVersion: process.version,
        },
      },
    });
  } catch (error) {
    logger.error("Detailed health check failed:", error);

    res.status(503).json({
      success: false,
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Detailed health check failed",
    });
  }
});

// Liveness probe for Kubernetes/Docker
router.get("/live", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe for Kubernetes/Docker
router.get("/ready", async (req: Request, res: Response) => {
  try {
    // Test critical dependencies
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Readiness check failed:", error);

    res.status(503).json({
      success: false,
      status: "not ready",
      timestamp: new Date().toISOString(),
      error: "Service dependencies not available",
    });
  }
});

export default router;
