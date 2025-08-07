import { Router, Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";
import { cookieNames } from "../config/constants";

const router: Router = Router();

// Get user profile
router.get("/profile", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isAnonymous: true,
        hashedId: true,
        // createdAt: true,
        // updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    logger.error("Failed to get user profile:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get user profile",
    });
  }
});

// Get user statistics
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const stats = await prisma.$transaction(async (tx) => {
      const conversationCount = await tx.conversation.count({
        where: { userId, isActive: true },
      });

      const messageCount = await tx.message.count({
        where: {
          conversation: { userId },
        },
      });

      const totalTokens = await tx.apiUsage.aggregate({
        where: { userId },
        _sum: { tokens: true },
      });

      const totalCost = await tx.apiUsage.aggregate({
        where: { userId },
        _sum: { cost: true },
      });

      return {
        conversations: conversationCount,
        messages: messageCount,
        tokens: totalTokens._sum.tokens || 0,
        cost: totalCost._sum.cost || 0,
      };
    });

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    logger.error("Failed to get user stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user statistics",
    });
  }
});

// Delete user account (GDPR compliance)
router.delete("/account", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await prisma.$transaction(async (tx) => {
      // Delete all user data
      await tx.session.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: { isDeletedAt: new Date() },
      });
    });

    logger.info("User account deleted", {
      userId,
      correlationId: req.correlationId,
    });

    res.clearCookie(cookieNames.sessionToken);
    res.clearCookie(cookieNames.email);
    res.clearCookie(cookieNames.hashedId);
    res.clearCookie(cookieNames.isAnonymous);

    return res.json({
      success: true,
      message:
        "Account marked for deletion, we would completely delete your account after 30 days. This is to ensure that you have enough time to change your mind.",
    });
  } catch (error) {
    logger.error("Failed to delete user account:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
});

export default router;
