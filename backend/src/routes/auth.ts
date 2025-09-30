import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";
import { env, jwtConfig } from "../config/env";

const router = Router();

// Create anonymous user session
router.post("/anonymous", async (req: Request, res: Response) => {
  try {
    // Generate unique hash for anonymous user
    const hashedId = crypto
      .createHash("sha256")
      .update(crypto.randomUUID() + Date.now().toString())
      .digest("hex");

    // Create anonymous user
    const user = await prisma.user.create({
      data: {
        hashedId,
        isAnonymous: true,
      },
    });

    const sessionId = crypto.randomUUID();

    const sessionToken = jwt.sign(
      { userId: user.id, sessionId: sessionId },
      env.JWT_SECRET,
      {
        expiresIn: jwtConfig.expiresIn,
      }
    );

    const session = await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    logger.info("Anonymous user created", {
      userId: user.id,
      sessionId: session.id,
      correlationId: req.correlationId,
    });

    // Return the token in the response instead of setting cookies
    res.status(201).json({
      success: true,
      message: "Anonymous session created successfully",
      data: {
        token: sessionToken,
        user: {
          id: user.id,
          isAnonymous: true,
          hashedId: user.hashedId,
        },
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    logger.error("Failed to create anonymous session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create anonymous session",
    });
  }
});

// Register with email (optional)
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      const hashedId = crypto
        .createHash("sha256")
        .update(email + Date.now().toString())
        .digest("hex");

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          hashedId,
          isAnonymous: false,
          password: hashedPassword,
        },
      });

      logger.info("User registered", {
        userId: user.id,
        email: user.email,
        correlationId: req.correlationId,
      });

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: user.id,
            email: user.email,
            isAnonymous: false,
            hashedId: user.hashedId,
          },
        },
      });
    } catch (error) {
      logger.error("Registration failed:", error);
      return res.status(500).json({
        success: false,
        message: "Registration failed",
      });
    }
  }
);

// Login
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || user.isAnonymous) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password!);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      if (user.isDeletedAt) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isDeletedAt: null },
        });
      }

      const sessionId = crypto.randomUUID();

      // Create new session
      const sessionToken = jwt.sign(
        { userId: user.id, sessionId: sessionId },
        env.JWT_SECRET!,
        { expiresIn: jwtConfig.expiresIn as number }
      );

      const session = await prisma.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          token: sessionToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      logger.info("User logged in", {
        userId: user.id,
        email: user.email,
        sessionId: session.id,
        correlationId: req.correlationId,
      });

      // Return token in the response instead of setting cookies
      return res.json({
        success: true,
        message: "Login successful",
        data: {
          token: sessionToken,
          user: {
            id: user.id,
            email: user.email,
            isAnonymous: false,
            hashedId: user.hashedId,
          },
          expiresAt: session.expiresAt,
        },
      });
    } catch (error) {
      logger.error("Login failed:", error);
      return res.status(500).json({
        success: false,
        message: "Login failed",
      });
    }
  }
);

// Logout
router.post("/logout", async (req: Request, res: Response) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    if (token) {
      // Delete session
      await prisma.session.deleteMany({
        where: { token },
      });

      logger.info("User logged out", {
        correlationId: req.correlationId,
      });
    }

    return res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    logger.error("Logout failed:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
});

// Logout from all devices
router.post("/logout/all-devices", async (req: Request, res: Response) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({
        success: false,
        message: "No active session found",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT token
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;

    // Delete all sessions for this user
    await prisma.session.deleteMany({
      where: { userId: decoded.userId },
    });

    logger.info("User logged out from all devices", {
      correlationId: req.correlationId,
    });

    return res.json({
      success: true,
      message: "Logout from all devices successful",
    });
  } catch (error) {
    logger.error("Logout failed:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
});

// Validate token
router.post("/validate", async (req: Request, res: Response) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const authToken = authHeader.split(" ")[1];

    if (!authToken) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    // Verify token
    const decoded = jwt.verify(authToken, jwtConfig.secret);

    if (!decoded || typeof decoded !== "object" || !("userId" in decoded)) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Check session
    const session = await prisma.session.findUnique({
      where: { token: authToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    return res.json({
      success: true,
      message: "Token is valid",
      data: {
        user: {
          id: session.user.id,
          email: session.user.email,
          isAnonymous: session.user.isAnonymous,
          hashedId: session.user.hashedId,
        },
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    logger.error("Token validation failed:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
});

export default router;
