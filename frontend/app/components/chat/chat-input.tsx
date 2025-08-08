import React from "react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { SendIcon } from "lucide-react";

export function ChatInput({
  isLoading,
  onSend,
  onInputChange,
}: {
  isLoading: boolean;
  onSend: (input: string) => void;
  onInputChange?: (value: string) => void;
}) {
  const [input, setInput] = React.useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    onInputChange?.(value);
  };

  const handleSend = () => {
    onSend(input);
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Type your message here..."
            className="min-h-[60px] resize-none pr-12 max-h-32"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="absolute right-2 bottom-2 h-8 w-8 p-0"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-2 text-center">
        Press Enter to send, Shift + Enter for new line
      </div>
    </div>
  );
}
