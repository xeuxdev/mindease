import * as React from "react";
import { useParams } from "react-router";
import { io, Socket } from "socket.io-client";
import { ChatInput } from "~/components/chat/chat-input";
import { ChatMessages } from "~/components/chat/chat-messages";
import { ChatMessageLoader } from "~/components/ui/loaders";
import { CrisisModal } from "~/components/chat/crisis-modal";
import type { CrisisDetectionResult } from "~/api/types";

interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface AIChunkResponse {
  conversationId: string;
  content: string;
  fullContent: string;
}

const socketUrl = import.meta.env.VITE_SOCKET_URL;

export default function ConversationPage() {
  const { id: conversationId } = useParams();

  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [conversationTitle, setConversationTitle] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(
    null,
  );
  const [fetchingMessages, setFetchingMessages] = React.useState(true);
  const [waitForAIResponse, setWaitForAIResponse] = React.useState(false);
  const [crisisData, setCrisisData] =
    React.useState<CrisisDetectionResult | null>(null);
  const [showCrisisModal, setShowCrisisModal] = React.useState(false);

  React.useEffect(() => {
    console.log("Connecting to socket:", socketUrl);

    setFetchingMessages(true);

    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      timeout: 5000,
    });

    // Connection event handlers
    newSocket.on("connect", () => {
      console.log("Connected to socket server");
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on("connection", (data) => {
      console.log("Connection acknowledged:", data);
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected from socket server:", reason);
      setIsConnected(false);
      setConnectionError(`Disconnected: ${reason}`);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setConnectionError(`Connection failed: ${error.message}`);
      setIsConnected(false);
    });

    newSocket.emit("get_conversation", { conversationId });

    // newSocket.on("message_saved", (data) => {
    //   console.log("Message saved:", data);

    // });

    // AI typing indicator
    newSocket.on("ai_typing", (data) => {
      console.log("AI is typing:", data);
      setIsLoading(true);
    });

    // AI streaming chunks

    newSocket.on("ai_chunk", (data: AIChunkResponse) => {
      console.log("Received AI chunk:", data);
      setWaitForAIResponse(false);

      if (data.conversationId && data.content !== undefined) {
        // Generate a consistent message ID based on conversation
        const messageId = `ai_response_${data.conversationId}_${Date.now()}`;

        setMessages((prev) => {
          // Find existing streaming message for this conversation
          const existingStreamingMessage = prev.find(
            (msg) =>
              msg.role === "ASSISTANT" &&
              msg.isStreaming &&
              msg.id.includes(data.conversationId),
          );

          if (existingStreamingMessage) {
            // Update existing streaming message with new content
            return prev.map((msg) =>
              msg.id === existingStreamingMessage.id
                ? {
                    ...msg,
                    content: data.fullContent + data.content,
                    isStreaming: true,
                  }
                : msg,
            );
          } else {
            // Create new streaming message
            const newMessage: Message = {
              id: messageId,
              content: data.fullContent || data.content,
              timestamp: new Date(),
              role: "ASSISTANT",
              isStreaming: true,
            };
            return [...prev, newMessage];
          }
        });
      }
    });

    // AI stopped typing
    newSocket.on("ai_stopped_typing", (data) => {
      console.log("AI stopped typing:", data);
      setIsLoading(false);
    });

    // AI response complete
    newSocket.on("ai_response_complete", (data) => {
      console.log("AI response complete:", data);
      setIsLoading(false);

      // Mark all streaming messages as complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.isStreaming && msg.role === "ASSISTANT"
            ? { ...msg, isStreaming: false }
            : msg,
        ),
      );
    });

    // Error handling
    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
      const errorMessage =
        typeof error === "string"
          ? error
          : error?.message || "An error occurred while processing your message";
      setConnectionError(errorMessage);
      setIsLoading(false);
      setWaitForAIResponse(false);
    });

    // AI response error (when backend has error generating response)
    newSocket.on(
      "ai_error",
      (data: { error: string; conversationId?: string }) => {
        console.error("AI generation error:", data);
        setConnectionError(data.error || "Failed to generate response");
        setIsLoading(false);
        setWaitForAIResponse(false);
        // Mark streaming message as failed
        setMessages((prev) =>
          prev.map((msg) =>
            msg.isStreaming && msg.role === "ASSISTANT"
              ? { ...msg, isStreaming: false }
              : msg,
          ),
        );
      },
    );

    // Get conversation messages
    newSocket.on(
      "conversation_messages",
      (data: { messages: Message[]; conversation: Conversation }) => {
        console.log("Received conversation messages:", data);
        setFetchingMessages(false);

        if (data.messages && Array.isArray(data.messages)) {
          const formattedMessages = data.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content || "",
            timestamp: msg.timestamp || Date.now(),
            isStreaming: false,
          }));
          setMessages(formattedMessages);
          setConversationTitle(data.conversation.title);
        }
      },
    );

    // Crisis detection event
    newSocket.on("crisis_detected", (data: CrisisDetectionResult) => {
      console.log("Crisis detected:", data);
      setCrisisData(data);
      setShowCrisisModal(true);
    });

    // Listen for any unhandled events (for debugging)
    newSocket.onAny((event, ...args) => {
      console.log(`Received event: ${event}`, args);
    });

    setSocket(newSocket);

    return () => {
      setIsLoading(false);
      newSocket.close();
    };
  }, [conversationId]);

  const handleSend = async (input: string) => {
    if (!socket || !input.trim() || isLoading || !isConnected) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "USER",
      content: input.trim(),
      timestamp: new Date(),
    };

    // Add message to local state immediately
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setWaitForAIResponse(true);

    // Send to server in the expected format
    socket.emit("chat_message", {
      message: input.trim(),
      conversationId: conversationId,
    });
  };

  const reconnect = () => {
    setConnectionError(null);
    setIsLoading(false);
    setWaitForAIResponse(false);
    if (socket) {
      socket.connect();
    }
  };

  if (fetchingMessages) {
    return <ChatMessageLoader />;
  }

  const hasError = connectionError !== null;

  return (
    <div className="flex flex-col h-full">
      <title>{conversationTitle}</title>

      {/* Error Banner */}
      {hasError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 text-sm">
                  Connection Error
                </h3>
                <p className="text-red-700 text-sm mt-1">{connectionError}</p>
              </div>
              <button
                onClick={reconnect}
                className="text-red-700 hover:text-red-900 font-medium text-sm whitespace-nowrap ml-2"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatMessages isLoading={waitForAIResponse} messages={messages} />

      {/* Fixed input area */}
      <ChatInput
        isLoading={isLoading || !isConnected || hasError}
        onSend={handleSend}
      />

      {/* Crisis Detection Modal */}
      {crisisData && (
        <CrisisModal
          isOpen={showCrisisModal}
          onClose={() => setShowCrisisModal(false)}
          crisisData={crisisData}
        />
      )}
    </div>
  );
}
