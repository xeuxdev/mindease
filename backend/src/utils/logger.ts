import winston from "winston";
import path from "path";
import fs from "fs";
import { env } from "../config/env";

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint(),
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return log;
  }),
);

const transports: winston.transport[] = [];

// Always add console transport (essential for serverless/Vercel)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
  }),
);

// Only add file transports in development
if (env.NODE_ENV === "development") {
  const logsDir = path.join(process.cwd(), "logs");
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, "app.log"),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    );

    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, "error.log"),
        level: "error",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    );
  } catch (err) {
    console.warn("Could not create logs directory, skipping file logging.");
  }
}

// Create logger instance
const logger = winston.createLogger({
  level: env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "mindease-backend" },
  transports: transports,
});

// Create a stream for morgan HTTP request logging
const httpLogStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export { logger, httpLogStream };
