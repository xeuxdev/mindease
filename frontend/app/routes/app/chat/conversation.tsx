import * as React from "react";
import { useParams } from "react-router";
import { io, Socket } from "socket.io-client";
import { ChatInput } from "~/components/chat/chat-input";
import { ChatMessages } from "~/components/chat/chat-messages";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatUser {
  id: string;
  name: string;
  isTyping: boolean;
}

export default function ConversationPage() {
  const { id: conversationId } = useParams();

  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(
    null
  );
  const [isTyping, setIsTyping] = React.useState(false);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL;

    console.log("Connecting to socket:", socketUrl);
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

    // Chat message handlers
    newSocket.on("chat_message", (data) => {
      console.log("Received message:", data);

      // Handle the new AI response format
      if (data.conversation && data.message) {
        // Update conversation info

        // Create message from AI response
        const newMessage: Message = {
          id: data.message.id || Date.now().toString(),
          content: data.message.content || "",
          role: data.message.role === "ASSISTANT" ? "assistant" : "user",
          timestamp: new Date(data.message.timestamp || Date.now()),
          isStreaming: false,
        };

        setMessages((prev) => {
          // Check if message already exists (to avoid duplicates)
          const existingMessage = prev.find((msg) => msg.id === newMessage.id);
          if (existingMessage) {
            // Update existing message content (for streaming)
            return prev.map((msg) =>
              msg.id === newMessage.id
                ? { ...msg, content: newMessage.content, isStreaming: false }
                : msg
            );
          }
          return [...prev, newMessage];
        });
      } else {
        // Handle legacy format or any other format
        const newMessage: Message = {
          id: data.id || Date.now().toString(),
          content:
            data.message || data.text || data.content || JSON.stringify(data),
          role: "assistant",
          timestamp: new Date(data.timestamp || Date.now()),
        };
        setMessages((prev) => [...prev, newMessage]);
      }
      setIsLoading(false);
    });

    // Also listen for any AI response events
    newSocket.on("ai_response", (data) => {
      console.log("Received AI response:", data);

      if (data.conversation && data.message) {
        const newMessage: Message = {
          id: data.message.id || Date.now().toString(),
          content: data.message.content || "",
          role: "assistant",
          timestamp: new Date(data.message.timestamp || Date.now()),
          isStreaming: false,
        };

        setMessages((prev) => [...prev, newMessage]);
      }
      setIsLoading(false);
    });

    // Handle streaming messages (partial content)
    newSocket.on("message_stream", (data) => {
      console.log("Received stream:", data);

      if (data.conversation && data.message) {
        const messageId = data.message.id;
        const content = data.message.content || "";

        setMessages((prev) => {
          const existingMessage = prev.find((msg) => msg.id === messageId);

          if (existingMessage) {
            // Update existing streaming message
            return prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: content, isStreaming: true }
                : msg
            );
          } else {
            // Create new streaming message
            const newMessage: Message = {
              id: messageId,
              content: content,
              role: "assistant",
              timestamp: new Date(data.message.timestamp || Date.now()),
              isStreaming: true,
            };
            return [...prev, newMessage];
          }
        });
      }
    });

    // Handle stream completion
    newSocket.on("message_complete", (data) => {
      console.log("Stream complete:", data);

      if (data.message && data.message.id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.message.id ? { ...msg, isStreaming: false } : msg
          )
        );
      }
      setIsLoading(false);
    });

    // Error handling
    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
      setConnectionError(`Error: ${error.message || error}`);
      setIsLoading(false);
    });

    newSocket.on("ai_stopped_typing", (data) => {
      console.log("User stopped typing:", data);
      const userId = data.userId || data.user || data.id;

      setIsLoading(false);
    });

    // Listen for any unhandled events (for debugging)
    newSocket.onAny((event, ...args) => {
      console.log(`Received event: ${event}`, args);
    });

    setSocket(newSocket);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      newSocket.close();
    };
  }, []);

  const handleSend = async (input: string) => {
    if (!socket || !input.trim() || isLoading || !isConnected) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    // Add message to local state immediately
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Send to server in the expected format
    socket.emit("chat_message", {
      message: input.trim(),
      timestamp: Date.now(),
      sender: "You",
      conversationId: conversationId,
    });

    handleStopTyping();
  };

  const handleInputChange = (value: string) => {
    if (!socket) return;

    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { userId: "current_user", userName: "You" });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (socket && isTyping) {
      setIsTyping(false);
      socket.emit("stop_typing", { userId: "current_user" });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection status indicator */}
      {!isConnected && (
        <div className="bg-red-50 border-b border-red-200 p-2">
          <div className="flex items-center justify-center gap-2 text-sm text-red-600">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Disconnected from chat server</span>
            {connectionError && <span>- {connectionError}</span>}
          </div>
        </div>
      )}

      {/* Messages area with fixed scroll */}
      <ChatMessages isLoading={isLoading} messages={messages} />

      {/* Fixed input area */}
      <ChatInput
        isLoading={isLoading || !isConnected}
        onSend={handleSend}
        onInputChange={handleInputChange}
      />
    </div>
  );
}
