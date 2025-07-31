import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define the schema for environment variables
const envSchema = z.object({
  // Server configuration
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .default("3000")
    .transform((val) => parseInt(val, 10)),

  // Database configuration
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // JWT configuration
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().default("604800"), // 7 days in seconds

  // External API keys
  OPENAI_API_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default("900000")
    .transform((val) => parseInt(val, 10)), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .default("100")
    .transform((val) => parseInt(val, 10)),

  // CORS configuration
  CORS_ORIGIN: z.string().default("*"),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

  // Session configuration
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters long")
    .optional(),

  // File upload limits
  MAX_FILE_SIZE: z
    .string()
    .default("5242880")
    .transform((val) => parseInt(val, 10)), // 5MB

  // WebSocket configuration
  WS_HEARTBEAT_INTERVAL: z
    .string()
    .default("30000")
    .transform((val) => parseInt(val, 10)), // 30 seconds

  // AI Service configuration
  AI_MODEL: z.string().default("gpt-3.5-turbo"),
  AI_MAX_TOKENS: z
    .string()
    .default("1000")
    .transform((val) => parseInt(val, 10)),
  AI_TEMPERATURE: z
    .string()
    .default("0.7")
    .transform((val) => parseFloat(val)),

  // Security
  BCRYPT_ROUNDS: z
    .string()
    .default("12")
    .transform((val) => parseInt(val, 10)),

  // Admin configuration
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  // Encryption key for sensitive data
  ENCRYPTION_KEY: z
    .string()
    .length(64, "ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"),
});

// Validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err) => {
        const path = err.path.join(".");
        const message = err.message;
        return `${path}: ${message}`;
      });

      console.error("❌ Environment validation failed:");
      missingVars.forEach((varError: string) => {
        console.error(`  - ${varError}`);
      });

      process.exit(1);
    }
    throw error;
  }
};

// Export validated environment variables
export const env = parseEnv();

// Type for the environment variables
export type Env = typeof env;

// Helper function to check if we're in development
export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

// Validation function to ensure required variables for specific features
export const validateFeatureRequirements = () => {
  const warnings: string[] = [];

  // Check AI service requirements
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY) {
    warnings.push("No AI API keys provided. AI features will be unavailable.");
  }

  // Check admin requirements
  if (isProduction && (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD)) {
    warnings.push("Admin credentials not set in production environment.");
  }

  // Check session secret in production
  if (isProduction && !env.SESSION_SECRET) {
    warnings.push("SESSION_SECRET not set in production environment.");
  }

  if (warnings.length > 0) {
    console.warn("⚠️  Environment warnings:");
    warnings.forEach((warning) => {
      console.warn(`  - ${warning}`);
    });
  }
};

// Export individual environment groups for convenience
export const dbConfig = {
  url: env.DATABASE_URL,
} as const;

export const jwtConfig = {
  secret: env.JWT_SECRET,
  expiresIn: Number(env.JWT_EXPIRES_IN),
} as const;

export const serverConfig = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  corsOrigin: env.CORS_ORIGIN,
} as const;

export const rateLimitConfig = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
} as const;

export const aiConfig = {
  openaiApiKey: env.OPENAI_API_KEY,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  model: env.AI_MODEL,
  maxTokens: env.AI_MAX_TOKENS,
  temperature: env.AI_TEMPERATURE,
} as const;

export const securityConfig = {
  bcryptRounds: env.BCRYPT_ROUNDS,
  sessionSecret: env.SESSION_SECRET,
} as const;
