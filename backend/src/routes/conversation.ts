import { Request, Response, Router } from "express";
import { query } from "express-validator";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";
import { aiService } from "../services/ai-service";

const router = Router();

// Get user conversations
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const conversations = await prisma.conversation.findMany({
        where: {
          userId,
          isActive: true,
        },
        include: {
          messages: {
            orderBy: { timestamp: "desc" },
            take: 1, // Get latest message for preview
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
      });

      const total = await prisma.conversation.count({
        where: {
          userId,
          isActive: true,
        },
      });

      res.json({
        success: true,
        data: {
          conversations: conversations.map((conv) => ({
            id: conv.id,
            title: conv.title,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            messageCount: conv._count.messages,
            lastMessage: conv.messages[0]
              ? {
                  content:
                    conv.messages[0].content.substring(0, 100) +
                    (conv.messages[0].content.length > 100 ? "..." : ""),
                  timestamp: conv.messages[0].timestamp,
                  role: conv.messages[0].role,
                }
              : null,
          })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Failed to get conversations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get conversations",
      });
    }
  }
);

// Get specific conversation
router.get("/:conversationId", async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        messages: conversation.messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp,
        })),
      },
    });
  } catch (error) {
    logger.error("Failed to get conversation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get conversation",
    });
  }
});

// start new conversation
router.post("/", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const userId = req.user?.id!;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    const newConversation = await prisma.conversation.create({
      data: {
        userId,
        title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
      },
    });

    await prisma.message.create({
      data: {
        conversationId: newConversation.id,
        content: message,
        role: "USER",
      },
    });

    const aiResponse = await aiService.generateResponse(message);

    await prisma.message.create({
      data: {
        conversationId: newConversation.id,
        content: aiResponse.content,
        role: "ASSISTANT",
        metadata: {
          model: "generation",
        },
      },
    });

    logger.info("New conversation started", {
      userId,
      conversationId: newConversation.id,
      correlationId: req.correlationId,
    });

    return res.status(201).json({
      success: true,
      message: "Conversation started successfully",
      data: {
        conversationId: newConversation.id,
      },
    });
  } catch (error) {
    logger.error("Failed to start conversation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start conversation",
    });
  }
});

// Delete conversation
router.delete("/:conversationId", async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Soft delete - mark as inactive
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { isActive: false },
    });

    logger.info("Conversation deleted", {
      userId,
      conversationId,
      correlationId: req.correlationId,
    });

    return res.json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    logger.error("Failed to delete conversation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete conversation",
    });
  }
});

// Update conversation title
router.patch("/:conversationId", async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;
    const userId = req.user!.id;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { title: title.trim() },
    });

    return res.json({
      success: true,
      message: "Conversation updated successfully",
      data: {
        conversation: {
          id: updatedConversation.id,
          title: updatedConversation.title,
          updatedAt: updatedConversation.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error("Failed to update conversation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update conversation",
    });
  }
});

export default router;
