'use client';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownAnimateTextProps {
    content: string;
    codeStyle?: any;
}

const MarkdownAnimateText: React.FC<MarkdownAnimateTextProps> = ({
    content,
    codeStyle = vscDarkPlus,
}) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const components = React.useMemo(() => ({
        code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            
            if (!match) {
                return <code className={className} {...props}>{children}</code>;
            }

            return (
                <div className="relative">
                    <button
                        onClick={() => handleCopy(codeString)}
                        className="absolute top-2 right-2 z-10 opacity-70 hover:opacity-100 transition-opacity bg-black/20 rounded-lg p-2 text-white"
                        aria-label={copied ? 'Copied!' : 'Copy code'}
                    >
                        {copied ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        )}
                    </button>
                    <SyntaxHighlighter
                        style={codeStyle}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                    >
                        {codeString}
                    </SyntaxHighlighter>
                </div>
            );
        },
        a: ({ node, ...props }: any) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
        ),
    }), [codeStyle, copied]);

    return (
        <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
            {content}
        </ReactMarkdown>
    );
};

export default MarkdownAnimateText;