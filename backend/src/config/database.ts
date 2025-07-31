import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { env, isDevelopment } from "./env";

const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "event",
      level: "error",
    },
    {
      emit: "event",
      level: "info",
    },
    {
      emit: "event",
      level: "warn",
    },
  ],
});

// Log database queries in development
if (isDevelopment) {
  prisma.$on("query", (e) => {
    logger.debug("Database Query:", {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

// Log database errors
prisma.$on("error", (e) => {
  logger.error("Database Error:", e);
});

// Log database info
prisma.$on("info", (e) => {
  logger.info("Database Info:", e.message);
});

// Log database warnings
prisma.$on("warn", (e) => {
  logger.warn("Database Warning:", e.message);
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info("🗄️  Database connected successfully");

    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info("✅ Database connection test passed");
  } catch (error) {
    logger.error("❌ Failed to connect to database:", error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info("🔌 Database disconnected successfully");
  } catch (error) {
    logger.error("❌ Error disconnecting from database:", error);
    throw error;
  }
}

export { prisma };
