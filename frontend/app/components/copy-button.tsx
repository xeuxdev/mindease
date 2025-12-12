import { CheckIcon, CopyIcon } from "lucide-react";
import React from "react";
import { showSuccessToast } from "~/lib/utils";
import { Button } from "./ui/button";

export default function CopyButton({ content }: { content: string }) {
  const [isCopied, setIsCopied] = React.useState(false);

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setIsCopied(true);
      showSuccessToast("Copied to clipboard");

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0"
      onClick={() => copyToClipboard(content)}
    >
      {isCopied ? (
        <CheckIcon className="h-3 w-3" />
      ) : (
        <CopyIcon className="h-3 w-3" />
      )}
    </Button>
  );
}
