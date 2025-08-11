import { Bot, Copy, ThumbsDown, ThumbsUp, User } from "lucide-react";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { TypingIndicator } from "./typing-indicator";
import { formatTime, showSuccessToast } from "~/lib/utils";

export function ChatMessages({
  messages,
  isLoading,
}: {
  messages: {
    id: string;
    role: "USER" | "ASSISTANT";
    content: string;
    timestamp: Date;
  }[];
  isLoading: boolean;
}) {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      showSuccessToast("Copied to clipboard");
    });
  };

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea ref={scrollAreaRef} className="h-full">
        <div className="space-y-6 max-w-4xl mx-auto p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${
                message.role === "USER" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "ASSISTANT" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={`flex flex-col gap-2 max-w-[80%] ${
                  message.role === "USER" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-3 ${
                    message.role === "USER" ? "bg-muted ml-auto" : ""
                  }`}
                >
                  {message.role === "ASSISTANT" ? (
                    <div className="chat-markdown text-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          // Remove default margins and use CSS instead
                          p: ({ children }) => <p>{children}</p>,
                          ul: ({ children }) => <ul>{children}</ul>,
                          ol: ({ children }) => <ol>{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          h1: ({ children }) => <h1>{children}</h1>,
                          h2: ({ children }) => <h2>{children}</h2>,
                          h3: ({ children }) => <h3>{children}</h3>,
                          h4: ({ children }) => <h4>{children}</h4>,
                          h5: ({ children }) => <h5>{children}</h5>,
                          h6: ({ children }) => <h6>{children}</h6>,
                          blockquote: ({ children }) => (
                            <blockquote>{children}</blockquote>
                          ),
                          table: ({ children }) => <table>{children}</table>,
                          thead: ({ children }) => <thead>{children}</thead>,
                          tbody: ({ children }) => <tbody>{children}</tbody>,
                          tr: ({ children }) => <tr>{children}</tr>,
                          th: ({ children }) => <th>{children}</th>,
                          td: ({ children }) => <td>{children}</td>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatTime(message.timestamp)}</span>
                  {message.role === "ASSISTANT" && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(message.content)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* {message.role === "USER" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )} */}
            </div>
          ))}

          {isLoading && <TypingIndicator />}
        </div>
      </ScrollArea>
    </div>
  );
}
