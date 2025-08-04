import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";
import { aiService } from "../services/ai-service";
import { MessageRole } from "@prisma/client";

const router = Router();

// Send message and get AI response
router.post(
  "/message",
  [
    body("message").isString().isLength({ min: 1, max: 1000 }),
    body("conversationId").optional().isUUID(),
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

      const { message, conversationId } = req.body;
      const userId = req.user!.id;

      let conversation;

      // Get or create conversation
      if (conversationId) {
        conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            userId,
          },
          include: {
            messages: {
              orderBy: { timestamp: "asc" },
              take: 10, // Last 10 messages for context
            },
          },
        });

        if (!conversation) {
          return res.status(404).json({
            success: false,
            message: "Conversation not found",
          });
        }
      } else {
        // Create new conversation
        conversation = await prisma.conversation.create({
          data: {
            userId,
            title:
              message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          },
          include: {
            messages: true,
          },
        });
      }

      // Save user message
      const userMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          content: message,
          role: MessageRole.USER,
        },
      });

      // Get AI response
      const aiResponse = await aiService.generateResponse(
        message,
        conversation.messages
      );

      // Save AI message
      const aiMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          content: aiResponse.content,
          role: MessageRole.ASSISTANT,
          metadata: {
            tokens: aiResponse.tokens,
            model: aiResponse.model,
            responseTime: aiResponse.responseTime,
          },
        },
      });

      // Log API usage
      await prisma.apiUsage.create({
        data: {
          userId,
          endpoint: "/api/chat/message",
          method: "POST",
          tokens: aiResponse.tokens,
          cost: aiResponse.cost,
          responseTime: aiResponse.responseTime,
        },
      });

      logger.info("Chat message processed", {
        userId,
        conversationId: conversation.id,
        messageLength: message.length,
        tokens: aiResponse.tokens,
        responseTime: aiResponse.responseTime,
        correlationId: req.correlationId,
      });

      return res.json({
        success: true,
        data: {
          conversation: {
            id: conversation.id,
            title: conversation.title,
          },
          userMessage: {
            id: userMessage.id,
            content: userMessage.content,
            timestamp: userMessage.timestamp,
          },
          aiMessage: {
            id: aiMessage.id,
            content: aiMessage.content,
            timestamp: aiMessage.timestamp,
          },
        },
      });
    } catch (error) {
      logger.error("Chat message failed:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to process message",
      });
    }
  }
);

// Get conversation history
router.get(
  "/conversation/:conversationId",
  async (req: Request, res: Response) => {
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
  }
);

// Stream chat response (WebSocket alternative using SSE)
router.post(
  "/stream",
  [
    body("message").isString().isLength({ min: 1, max: 1000 }),
    body("conversationId").optional().isUUID(),
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

      // Set up Server-Sent Events
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      const { message, conversationId } = req.body;
      const userId = req.user!.id;

      try {
        // Stream AI response
        await aiService.streamResponse(
          message,
          conversationId,
          userId,
          (chunk) => {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
        );

        res.write('data: {"type": "end"}\n\n');
      } catch (streamError) {
        return res.write(
          `data: ${JSON.stringify({
            type: "error",
            message: "Stream failed",
          })}\n\n`
        );
      }

      return res.end();
    } catch (error) {
      logger.error("Chat stream failed:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to stream response",
      });
    }
  }
);

export default router;
