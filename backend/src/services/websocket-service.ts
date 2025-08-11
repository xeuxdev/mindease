import jwt from "jsonwebtoken";
import { Socket, Server as SocketIOServer } from "socket.io";
import { cookieNames } from "../config/constants";
import { prisma } from "../config/database";
import { env, jwtConfig } from "../config/env";
import { logger } from "../utils/logger";
import { aiService } from "./ai-service";

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

  /*
   * WebSocket Events Reference:
   *
   * Client to Server:
   * - chat_message: Send a message to AI (expects: { message: string, conversationId?: string })
   * - get_conversations: Get list of conversations
   * - get_conversation: Get conversation messages (expects: { conversationId: string })
   * - typing: User is typing (expects: { conversationId: string })
   * - stop_typing: User stopped typing (expects: { conversationId: string })
   *
   * Server to Client:
   * - message_saved: User message saved to database
   * - ai_typing: AI is generating response
   * - ai_chunk: Streaming chunk of AI response (expects: { conversationId: string, content: string, fullContent: string })
   * - ai_stopped_typing: AI finished generating response
   * - ai_response_complete: AI response fully generated and saved
   * - conversations_list: List of conversations
   * - conversation_messages: Messages in a conversation
   * - user_typing: Another user is typing
   * - user_stopped_typing: Another user stopped typing
   * - error: Error occurred
   */

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

        const startTime = Date.now();
        let fullContent = "";
        let aiMessageId: string | null = null;

        // Stream AI response
        await aiService.streamResponse(
          message,
          conversation.id,
          socket.userId!,
          async (chunk) => {
            if (chunk.type === "chunk") {
              fullContent += chunk.content;

              // Emit streaming chunk to client
              socket.emit("ai_chunk", {
                conversationId: conversation.id,
                content: chunk.content,
                fullContent: fullContent,
              });
            } else if (chunk.type === "done" || chunk.type === "complete") {
              try {
                // Stop typing indicator
                socket.emit("ai_stopped_typing", {
                  conversationId: conversation.id,
                });

                // Save AI message to database
                const aiMessage = await prisma.message.create({
                  data: {
                    conversationId: conversation.id,
                    content: fullContent,
                    role: "ASSISTANT",
                    metadata: {
                      model: "streaming",
                      responseTime: Date.now() - startTime,
                    },
                  },
                });

                aiMessageId = aiMessage.id;

                // Log API usage (with estimated tokens since streaming doesn't provide exact count)
                const estimatedTokens = Math.ceil(fullContent.length / 4);
                await prisma.apiUsage.create({
                  data: {
                    userId: socket.userId!,
                    endpoint: "websocket_chat_stream",
                    method: "WS",
                    tokens: estimatedTokens,
                    cost: estimatedTokens * 0.0000015,
                    responseTime: Date.now() - startTime,
                  },
                });

                // Emit completion event
                socket.emit("ai_response_complete", {
                  conversation: {
                    id: conversation.id,
                    title: conversation.title,
                  },
                  message: {
                    id: aiMessage.id,
                    content: fullContent,
                    role: aiMessage.role,
                    timestamp: aiMessage.timestamp,
                  },
                });

                logger.info("WebSocket streaming chat response completed", {
                  userId: socket.userId,
                  conversationId: conversation.id,
                  estimatedTokens,
                  responseTime: Date.now() - startTime,
                  socketId: socket.id,
                  messageLength: fullContent.length,
                });
              } catch (dbError) {
                logger.error("Failed to save streamed AI message:", dbError);
                socket.emit("error", {
                  message: "Failed to save AI response",
                  conversationId: conversation.id,
                });
              }
            } else if (chunk.type === "error") {
              // Stop typing indicator and emit error
              socket.emit("ai_stopped_typing", {
                conversationId: conversation.id,
              });
              socket.emit("error", {
                message: chunk.message || "Failed to generate AI response",
                conversationId: conversation.id,
              });

              logger.error("WebSocket AI streaming error", {
                userId: socket.userId,
                conversationId: conversation.id,
                error: chunk.message,
                socketId: socket.id,
              });
            }
          }
        );
      } catch (error) {
        logger.error("WebSocket chat message error:", {
          userId: socket.userId,
          socketId: socket.id,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        socket.emit("error", {
          message: "Failed to process message",
          error:
            env.NODE_ENV === "development"
              ? {
                  message:
                    error instanceof Error ? error.message : String(error),
                  name: error instanceof Error ? error.name : "Unknown",
                  stack: error instanceof Error ? error.stack : undefined,
                }
              : undefined,
        });
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
          messages: conversation.messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
            timestamp: msg.timestamp,
          })),
        });
      } catch (error) {
        logger.error("WebSocket get conversation error:", {
          userId: socket.userId,
          socketId: socket.id,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        socket.emit("error", { message: "Failed to get conversation" });
      }
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
        error: error.message || error,
      });
    });
  });

  logger.info("WebSocket server initialized");
}
