import * as React from "react";
import { ChatInput } from "./chat/chat-input";
import { ChatMessages } from "./chat/chat-messages";

export function ChatInterface() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSend = async (input: string) => {
    if (!input.trim()) return;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Start a conversation
            </h2>
            <p className="text-gray-600">How can I help you today?</p>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-gray-500">Try asking about:</div>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                Mental health tips
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                Stress management
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                Mindfulness
              </span>
            </div>
          </div>
        </div>
      </div>

      <ChatInput isLoading={isLoading} onSend={handleSend} />
    </div>
  );
}
