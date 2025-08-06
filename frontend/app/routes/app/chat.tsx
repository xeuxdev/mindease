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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    // Chat message handlers
    newSocket.on("chat_message", (data) => {
      console.log("Received message:", data);

      // Handle the new AI response format
      if (data.conversation && data.message) {
        // Update conversation info
        setCurrentConversation(data.conversation);

        // Create message from AI response
        const newMessage: Message = {
          id: data.message.id || Date.now().toString(),
          text: data.message.content || "",
          sender: data.message.role === "ASSISTANT" ? "AI Assistant" : "User",
          timestamp: new Date(data.message.timestamp || Date.now()),
          isOwnMessage: data.message.role === "USER",
          role: data.message.role,
          isStreaming: false,
        };

        setMessages((prev) => {
          // Check if message already exists (to avoid duplicates)
          const existingMessage = prev.find((msg) => msg.id === newMessage.id);
          if (existingMessage) {
            // Update existing message content (for streaming)
            return prev.map((msg) =>
              msg.id === newMessage.id
                ? { ...msg, text: newMessage.text, isStreaming: false }
                : msg
            );
          }
          return [...prev, newMessage];
        });
      } else {
        // Handle legacy format or any other format
        const newMessage: Message = {
          id: data.id || Date.now().toString(),
          text:
            data.message || data.text || data.content || JSON.stringify(data),
          sender: data.sender || data.user || "AI Assistant",
          timestamp: new Date(data.timestamp || Date.now()),
          isOwnMessage: false,
        };
        setMessages((prev) => [...prev, newMessage]);
      }
    });

    // Also listen for any AI response events
    newSocket.on("ai_response", (data) => {
      console.log("Received AI response:", data);

      if (data.conversation && data.message) {
        setCurrentConversation(data.conversation);

        const newMessage: Message = {
          id: data.message.id || Date.now().toString(),
          text: data.message.content || "",
          sender: "AI Assistant",
          timestamp: new Date(data.message.timestamp || Date.now()),
          isOwnMessage: false,
          role: "ASSISTANT",
          isStreaming: false,
        };

        setMessages((prev) => [...prev, newMessage]);
      }
    });

    // Handle streaming messages (partial content)
    newSocket.on("message_stream", (data) => {
      console.log("Received stream:", data);

      if (data.conversation && data.message) {
        setCurrentConversation(data.conversation);

        const messageId = data.message.id;
        const content = data.message.content || "";

        setMessages((prev) => {
          const existingMessage = prev.find((msg) => msg.id === messageId);

          if (existingMessage) {
            // Update existing streaming message
            return prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, text: content, isStreaming: true }
                : msg
            );
          } else {
            // Create new streaming message
            const newMessage: Message = {
              id: messageId,
              text: content,
              sender: "AI Assistant",
              timestamp: new Date(data.message.timestamp || Date.now()),
              isOwnMessage: false,
              role: "ASSISTANT",
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
    });

    // Error handling
    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
      setConnectionError(`Error: ${error.message || error}`);
    });

    // Typing indicators
    newSocket.on("typing", (data) => {
      console.log("User typing:", data);
      const userId = data.userId || data.user || data.id;
      const userName = data.userName || data.name || userId;

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

    newSocket.on("stop_typing", (data) => {
      console.log("User stopped typing:", data);
      const userId = data.userId || data.user || data.id;

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

    // Send to server in the expected format
    socket.emit("chat_message", {
      message: inputValue.trim(),
      timestamp: Date.now(),
      sender: "You",
      conversationId: currentConversation?.id,
    });

    setInputValue("");
    handleStopTyping();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

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
                    <span className="text-xs text-yellow-600">●</span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {message.text || "No content"}
                </p>
                {message.isStreaming && (
                  <div className="mt-1">
                    <div className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
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
            disabled={!isConnected || !inputValue.trim()}
          >
            Send
          </Button>
        </div>

        {!isConnected && (
          <p className="text-sm text-gray-500 mt-2">
            You must be connected to send messages
          </p>
        )}
      </div>
    </div>
  );
}
