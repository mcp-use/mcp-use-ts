import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface AssistantMessageProps {
  content: string;
  timestamp?: Date | number;
  isStreaming?: boolean;
}

export function AssistantMessage({
  content,
  timestamp,
  isStreaming = false,
}: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!content || content.length === 0) {
    return null;
  }

  return (
    <div className="flex items-start gap-6 group relative">
      <div className="flex-1 min-w-0">
        <div className="break-words">
          <div className="prose prose-sm max-w-none dark:prose-invert text-base leading-7 font-sans text-start break-words prose-pre:p-0 prose-pre:m-0 prose-pre:bg-transparent transition-all duration-300 ease-in-out">
            <p className="whitespace-pre-wrap">{content}</p>
          </div>
        </div>

        {timestamp && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {new Date(timestamp).toLocaleTimeString()}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

