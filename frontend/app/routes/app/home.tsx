import { useStartConversation } from "~/api/conversations";
import { ChatInput } from "~/components/chat/chat-input";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "MindEase" },
    { name: "description", content: "Welcome to MindEase!" },
  ];
}

export default function Home() {
  const { mutateAsync, isPending } = useStartConversation();

  const handleSend = async (input: string) => {
    if (!input.trim()) return;

    mutateAsync({ message: input });
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Loading overlay during conversation start */}
      {isPending && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-6 p-8">
            {/* Animated loading icon */}
            <div className="relative">
              <div
                className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-xl"
                style={{ borderRadius: "var(--radius-lg)" }}
              >
                <svg
                  className="w-10 h-10 text-primary-foreground animate-pulse"
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

              {/* Spinning ring */}
              <div className="absolute -inset-6 border-2 border-transparent border-t-primary/60 border-r-ring/60 rounded-full animate-spin [animation-direction:reverse] [animation-duration:3s]"></div>
            </div>

            {/* Loading content */}
            <div className="text-center space-y-3">
              <h3 className="text-xl font-semibold text-foreground">
                Starting conversation...
              </h3>
              <p className="text-muted-foreground max-w-xs">
                Setting up your personalized chat experience with MindEase
              </p>

              {/* Animated dots */}
              <div className="flex items-center justify-center space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
              </div>
            </div>

            {/* Background animation particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute w-1 h-1 bg-primary/40 rounded-full opacity-40 animate-bounce top-1/4 left-1/4 [animation-delay:0s] [animation-duration:2s]"></div>
              <div className="absolute w-1 h-1 bg-ring/40 rounded-full opacity-40 animate-bounce top-1/3 right-1/4 [animation-delay:0.7s] [animation-duration:2.5s]"></div>
              <div className="absolute w-1 h-1 bg-accent/40 rounded-full opacity-40 animate-bounce bottom-1/3 left-1/3 [animation-delay:1.4s] [animation-duration:3s]"></div>
              <div className="absolute w-1 h-1 bg-primary/40 rounded-full opacity-40 animate-bounce bottom-1/4 right-1/3 [animation-delay:2s] [animation-duration:2.5s]"></div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div
              className="w-16 h-16 mx-auto mb-4 bg-secondary rounded-full flex items-center justify-center"
              style={{ borderRadius: "var(--radius-lg)" }}
            >
              <svg
                className="w-8 h-8 text-primary"
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
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Start a conversation
            </h2>
            <p className="text-muted-foreground">How can I help you today?</p>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Try asking about:
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <span
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                style={{ borderRadius: "var(--radius-lg)" }}
              >
                Mental health tips
              </span>
              <span
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                style={{ borderRadius: "var(--radius-lg)" }}
              >
                Stress management
              </span>
              <span
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                style={{ borderRadius: "var(--radius-lg)" }}
              >
                Mindfulness
              </span>
            </div>
          </div>
        </div>
      </div>

      <ChatInput isLoading={isPending} onSend={handleSend} />
    </div>
  );
}
