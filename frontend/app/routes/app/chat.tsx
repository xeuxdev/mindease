import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isOwnMessage: boolean;
  role?: "USER" | "ASSISTANT";
  isStreaming?: boolean;
}

interface ChatUser {
  id: string;
  name: string;
  isTyping: boolean;
}

export default function ChatPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<ChatUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [isAIResponding, setIsAIResponding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations when connected
  useEffect(() => {
    if (isConnected && socket) {
      getConversations();
    }
  }, [isConnected, socket]);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || "ws://localhost:3001";

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

    // Message saved confirmation
    newSocket.on("message_saved", (data) => {
      console.log("Message saved:", data);
      // Optionally update message status or add confirmation
    });

    // AI typing indicator
    newSocket.on("ai_typing", (data) => {
      console.log("AI is typing:", data);
      setIsAIResponding(true);
    });

    // AI streaming chunks
    newSocket.on("ai_chunk", (data) => {
      console.log("Received AI chunk:", data);

      if (data.conversationId && data.content !== undefined) {
        // Update current conversation if provided
        if (data.conversationId && !currentConversation) {
          setCurrentConversation({
            id: data.conversationId,
            title: `Conversation ${data.conversationId.slice(-8)}`,
          });
        }

        // Generate a consistent message ID based on conversation
        const messageId = `ai_response_${data.conversationId}_${Date.now()}`;

        setMessages((prev) => {
          // Find existing streaming message for this conversation
          const existingStreamingMessage = prev.find(
            (msg) =>
              msg.role === "ASSISTANT" &&
              msg.isStreaming &&
              msg.id.includes(data.conversationId)
          );

          if (existingStreamingMessage) {
            // Update existing streaming message with new content
            return prev.map((msg) =>
              msg.id === existingStreamingMessage.id
                ? {
                    ...msg,
                    text: data.fullContent || msg.text + data.content,
                    isStreaming: true,
                  }
                : msg
            );
          } else {
            // Create new streaming message
            const newMessage: Message = {
              id: messageId,
              text: data.fullContent || data.content,
              sender: "AI Assistant",
              timestamp: new Date(),
              isOwnMessage: false,
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
      setIsAIResponding(false);
    });

    // AI response complete
    newSocket.on("ai_response_complete", (data) => {
      console.log("AI response complete:", data);
      setIsAIResponding(false);
      setStreamingMessageId(null);

      // Mark all streaming messages as complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.isStreaming && msg.role === "ASSISTANT"
            ? { ...msg, isStreaming: false }
            : msg
        )
      );
    });

    // Error handling
    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
      setConnectionError(`Error: ${error.message || error}`);
      setIsAIResponding(false);
      setStreamingMessageId(null);
    });

    // Get conversations list
    // newSocket.on("conversations_list", (data) => {
    //   console.log("Received conversations list:", data);
    //   // Handle conversations list if needed
    // });

    // Get conversation messages
    newSocket.on("conversation_messages", (data) => {
      console.log("Received conversation messages:", data);
      if (data.messages && Array.isArray(data.messages)) {
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          text: msg.content || msg.message || "",
          sender: msg.role === "ASSISTANT" ? "AI Assistant" : "You",
          timestamp: new Date(msg.timestamp || msg.createdAt || Date.now()),
          isOwnMessage: msg.role === "USER",
          role: msg.role,
          isStreaming: false,
        }));
        setMessages(formattedMessages);
      }
    });

    // User typing indicators (for other users)
    newSocket.on("user_typing", (data) => {
      console.log("User typing:", data);
      const userId = data.userId || data.user || data.id || "unknown";
      const userName = data.userName || data.name || `User ${userId}`;

      setTypingUsers((prev) => {
        const existingUser = prev.find((user) => user.id === userId);
        if (existingUser) {
          return prev.map((user) =>
            user.id === userId ? { ...user, isTyping: true } : user
          );
        } else {
          return [...prev, { id: userId, name: userName, isTyping: true }];
        }
      });
    });

    // User stopped typing
    newSocket.on("user_stopped_typing", (data) => {
      console.log("User stopped typing:", data);
      const userId = data.userId || data.user || data.id || "unknown";
      setTypingUsers((prev) => prev.filter((user) => user.id !== userId));
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
      // Clear streaming state on cleanup
      setIsAIResponding(false);
      setStreamingMessageId(null);
      newSocket.close();
    };
  }, []);

  const handleSendMessage = () => {
    if (!socket || !inputValue.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: "You",
      timestamp: new Date(),
      isOwnMessage: true,
      role: "USER",
    };

    // Add message to local state immediately
    setMessages((prev) => [...prev, message]);

    // Send to server in the expected format (according to backend reference)
    socket.emit("chat_message", {
      message: inputValue.trim(),
      conversationId: currentConversation?.id,
    });

    setInputValue("");
    handleStopTyping();

    // Set AI responding state
    setIsAIResponding(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    if (!socket || !currentConversation?.id) return;

    // Send typing indicator (according to backend reference)
    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", {
        conversationId: currentConversation.id,
      });
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
    if (socket && isTyping && currentConversation?.id) {
      setIsTyping(false);
      socket.emit("stop_typing", {
        conversationId: currentConversation.id,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const reconnect = () => {
    if (socket) {
      socket.connect();
    }
  };

  const getConversations = () => {
    if (socket) {
      socket.emit("get_conversations");
    }
  };

  const loadConversation = (conversationId: string) => {
    if (socket) {
      socket.emit("get_conversation", { conversationId });
      setCurrentConversation({
        id: conversationId,
        title: `Conversation ${conversationId.slice(-8)}`,
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Chat</h1>
            {currentConversation && (
              <p className="text-sm text-gray-500">
                {currentConversation.title}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="text-sm text-gray-600">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            {!isConnected && (
              <Button onClick={reconnect} size="sm" variant="outline">
                Reconnect
              </Button>
            )}
          </div>
        </div>

        {connectionError && (
          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            {connectionError}
          </div>
        )}

        {/* Debug info */}
        <div className="mt-2 text-xs text-gray-400">
          Messages: {messages.length} | Connected: {isConnected ? "Yes" : "No"}{" "}
          | Conversation: {currentConversation?.id || "None"}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.isOwnMessage ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.isOwnMessage
                    ? "bg-blue-500 text-white"
                    : "bg-white border border-gray-200 text-gray-900"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">{message.sender}</span>
                  <span
                    className={`text-xs ${
                      message.isOwnMessage ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </span>
                  {message.isStreaming && (
                    <span className="text-xs text-yellow-600">● streaming</span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {message.text || "No content"}
                </p>
                {message.isStreaming && (
                  <div className="mt-1 flex items-center gap-1">
                    <div className="w-1 h-1 bg-current rounded-full animate-pulse"></div>
                    <div
                      className="w-1 h-1 bg-current rounded-full animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-1 h-1 bg-current rounded-full animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-200 px-4 py-2 rounded-lg">
              <p className="text-sm text-gray-600">
                {typingUsers.map((user) => user.name).join(", ")}
                {typingUsers.length === 1 ? " is" : " are"} typing...
              </p>
            </div>
          </div>
        )}

        {/* AI responding indicator */}
        {isAIResponding && (
          <div className="flex justify-start">
            <div className="bg-blue-100 px-4 py-2 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
                <p className="text-sm text-blue-700">AI is thinking...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!isConnected}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !inputValue.trim() || isAIResponding}
          >
            {isAIResponding ? "..." : "Send"}
          </Button>
        </div>

        {!isConnected && (
          <p className="text-sm text-gray-500 mt-2">
            You must be connected to send messages
          </p>
        )}

        {isAIResponding && (
          <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
            <span>AI is generating response...</span>
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
              <div
                className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </p>
        )}
      </div>
    </div>
  );
}
