import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";
import { aiService } from "./ai-service";
import { env, jwtConfig } from "../config/env";
import { cookieNames } from "../config/constants";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

// Helper function to parse cookies from cookie string
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieString) return cookies;

  cookieString.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  return cookies;
}

export function setupWebSocket(io: SocketIOServer) {
  // Authentication middleware for socket connections

  console.log("Setting up WebSocket authentication middleware");

  io.use(async (socket: AuthenticatedSocket, next) => {
    // const cookie = socket.request.headers.cookie;
    try {
      const cookieString = socket.handshake.headers.cookie;
      const cookies = parseCookies(cookieString || "");
      const token = cookies[cookieNames.sessionToken];

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, jwtConfig.secret);

      if (
        !decoded ||
        typeof decoded !== "object" ||
        !("sessionId" in decoded)
      ) {
        return next(new Error("Invalid token"));
      }

      // Check session using sessionId from JWT payload
      const session = await prisma.session.findUnique({
        where: {
          id: (decoded as any).sessionId,
          token: token,
        },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date()) {
        return next(new Error("Invalid or expired session"));
      }

      // Attach user info to socket
      socket.userId = session.user.id;
      socket.sessionId = session.id;

      logger.info("WebSocket client authenticated", {
        userId: socket.userId,
        sessionId: socket.sessionId,
        socketId: socket.id,
      });

      next();
    } catch (error) {
      logger.error("WebSocket authentication failed:", error);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    logger.info("Client connected to WebSocket", {
      userId: socket.userId,
      socketId: socket.id,
    });

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Handle chat messages
    socket.on("chat_message", async (data) => {
      try {
        const { message, conversationId } = data;

        if (!message || message.trim().length === 0) {
          socket.emit("error", { message: "Message cannot be empty" });
          return;
        }

        logger.info("WebSocket chat message received", {
          userId: socket.userId,
          conversationId,
          messageLength: message.length,
          socketId: socket.id,
        });

        // Get or create conversation
        let conversation;
        if (conversationId) {
          conversation = await prisma.conversation.findFirst({
            where: {
              id: conversationId,
              userId: socket.userId,
            },
            include: {
              messages: {
                orderBy: { timestamp: "asc" },
                take: 10,
              },
            },
          });

          if (!conversation) {
            socket.emit("error", { message: "Conversation not found" });
            return;
          }
        } else {
          conversation = await prisma.conversation.create({
            data: {
              userId: socket.userId!,
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
            role: "USER",
          },
        });

        // Emit user message back to client
        socket.emit("message_saved", {
          conversation: {
            id: conversation.id,
            title: conversation.title,
          },
          message: {
            id: userMessage.id,
            content: userMessage.content,
            role: userMessage.role,
            timestamp: userMessage.timestamp,
          },
        });

        // Start typing indicator
        socket.emit("ai_typing", { conversationId: conversation.id });

        // Generate AI response
        const aiResponse = await aiService.generateResponse(
          message,
          conversation.messages as any
        );

        // Save AI message
        const aiMessage = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            content: aiResponse.content,
            role: "ASSISTANT",
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
            userId: socket.userId!,
            endpoint: "websocket_chat",
            method: "WS",
            tokens: aiResponse.tokens,
            cost: aiResponse.cost,
            responseTime: aiResponse.responseTime,
          },
        });

        // Stop typing indicator and emit AI response
        socket.emit("ai_stopped_typing", { conversationId: conversation.id });
        socket.emit("ai_response", {
          conversation: {
            id: conversation.id,
            title: conversation.title,
          },
          message: {
            id: aiMessage.id,
            content: aiMessage.content,
            role: aiMessage.role,
            timestamp: aiMessage.timestamp,
          },
        });

        logger.info("WebSocket chat response sent", {
          userId: socket.userId,
          conversationId: conversation.id,
          tokens: aiResponse.tokens,
          responseTime: aiResponse.responseTime,
          socketId: socket.id,
        });
      } catch (error) {
        logger.error("WebSocket chat message error:", error);
        socket.emit("error", {
          message: "Failed to process message",
          error: env.NODE_ENV === "development" ? error : undefined,
        });
      }
    });

    // Handle conversation operations
    socket.on("get_conversations", async () => {
      try {
        const conversations = await prisma.conversation.findMany({
          where: {
            userId: socket.userId,
            isActive: true,
          },
          include: {
            messages: {
              orderBy: { timestamp: "desc" },
              take: 1,
            },
            _count: {
              select: { messages: true },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        });

        socket.emit("conversations_list", {
          conversations: conversations.map((conv: any) => ({
            id: conv.id,
            title: conv.title,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            messageCount: conv._count.messages,
            lastMessage: conv.messages[0]
              ? {
                  content: conv.messages[0].content.substring(0, 100),
                  timestamp: conv.messages[0].timestamp,
                  role: conv.messages[0].role,
                }
              : null,
          })),
        });
      } catch (error) {
        logger.error("WebSocket get conversations error:", error);
        socket.emit("error", { message: "Failed to get conversations" });
      }
    });

    // Handle get conversation messages
    socket.on("get_conversation", async (data) => {
      try {
        const { conversationId } = data;

        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            userId: socket.userId,
          },
          include: {
            messages: {
              orderBy: { timestamp: "asc" },
            },
          },
        });

        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        socket.emit("conversation_messages", {
          conversation: {
            id: conversation.id,
            title: conversation.title,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          },
          messages: conversation.messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
            timestamp: msg.timestamp,
          })),
        });
      } catch (error) {
        logger.error("WebSocket get conversation error:", error);
        socket.emit("error", { message: "Failed to get conversation" });
      }
    });

    // Handle typing indicators
    socket.on("typing", (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit("user_typing", {
        userId: socket.userId,
        conversationId,
      });
    });

    socket.on("stop_typing", (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit("user_stopped_typing", {
        userId: socket.userId,
        conversationId,
      });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      logger.info("Client disconnected from WebSocket", {
        userId: socket.userId,
        socketId: socket.id,
        reason,
      });
    });

    // Handle errors
    socket.on("error", (error) => {
      logger.error("WebSocket error:", {
        userId: socket.userId,
        socketId: socket.id,
        error,
      });
    });
  });

  logger.info("WebSocket server initialized");
}
