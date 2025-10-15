import React, { useState } from 'react'
import type { AssistantMessageProps } from './chat-types.js'
import { AnimatedMarkdown } from './AnimatedMarkdown/index.js'

interface CopyButtonProps {
  text: string
}

function CopyButton({ text }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <button
      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground text-xs flex items-center gap-1"
      onClick={handleCopy}
      title="Copy message content"
    >
      {isCopied ? (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

export function AssistantMessage({
  content,
  timestamp,
  isStreaming = false,
  className = '',
}: AssistantMessageProps) {
  if (!content || content.length === 0) {
    return null
  }

  return (
    <div className={`flex items-start gap-6 group relative ${className}`}>
      <div className="flex-1 min-w-0">
        <div className="break-words">
          <div className="prose prose-sm max-w-none dark:prose-invert text-base leading-7 font-sans text-start break-words prose-pre:p-0 prose-pre:m-0 prose-pre:bg-transparent transition-all duration-300 ease-in-out">
            <AnimatedMarkdown content={content} />
          </div>
        </div>

        {timestamp && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {new Date(timestamp).toLocaleTimeString()}
            </span>

            <CopyButton text={content} />
          </div>
        )}
      </div>
    </div>
  )
}

