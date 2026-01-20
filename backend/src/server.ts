import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";

// Import environment configuration (must be first)
import {
  env,
  jwtConfig,
  rateLimitConfig,
  serverConfig,
  validateFeatureRequirements,
} from "./config/env";

// Import middleware
import { authMiddleware } from "./middleware/auth-middleware";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./middleware/request-logger";

// Import routes
import authRoutes from "./routes/auth";
import conversationRoutes from "./routes/conversation";
import healthRoutes from "./routes/health";
import userRoutes from "./routes/user";
// import adminRoutes from "./routes/admin";

// Import services
import { connectDatabase } from "./config/database";
import { setupWebSocket } from "./services/websocket-service";
import { logger } from "./utils/logger";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: serverConfig.corsOrigin,
    credentials: true, // Allow credentials (cookies) to be sent
  },
});

// Validate feature requirements and show warnings
validateFeatureRequirements();

// Rate limiting
const limiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.maxRequests,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: serverConfig.corsOrigin,
    credentials: true,
  }),
);
app.use(limiter);
app.use(express.json({ limit: `${env.MAX_FILE_SIZE}b` }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/conversations", authMiddleware, conversationRoutes);
app.use("/api/users", authMiddleware, userRoutes);
// app.use("/api/admin", authMiddleware, adminRoutes);

// WebSocket setup
setupWebSocket(io);

// Error handling middleware (should be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start server
    server.listen(serverConfig.port, () => {
      logger.info(`🚀 Server running on port ${serverConfig.port}`);
      logger.info(
        `📊 Health check available at http://localhost:${serverConfig.port}/api/health`,
      );
      logger.info(`🌍 Environment: ${serverConfig.nodeEnv}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

startServer();

export { app, io };
