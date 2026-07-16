"use client";

import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border text-[13px]">
      <div className="flex items-center justify-between bg-surface px-3 py-1.5 text-xs text-foreground-muted">
        <span>{language || "text"}</span>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 transition-colors hover:bg-surface-hover hover:text-foreground"
          onClick={() => {
            navigator.clipboard.writeText(code).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language || "text"}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: "12px 14px",
            background: "transparent",
            fontSize: "inherit",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

// react-markdown v9+ dropped the `inline` flag from the code renderer —
// block-level fenced code is distinguished by being wrapped in a `pre`,
// so that's the reliable place to detect it, not `code` itself.
const components: Components = {
  code({ className, children, ...rest }) {
    return (
      <code
        className={className ?? "rounded bg-surface px-1.5 py-0.5 text-[0.85em]"}
        {...rest}
      >
        {children}
      </code>
    );
  },
  pre({ children }) {
    const codeEl = children as React.ReactElement<{
      className?: string;
      children?: React.ReactNode;
    }> | null;
    const className = codeEl?.props?.className ?? "";
    const match = /language-(\w+)/.exec(className);
    const codeText = String(codeEl?.props?.children ?? "").replace(/\n$/, "");
    return <CodeBlock language={match?.[1] ?? ""} code={codeText} />;
  },
  p({ children }) {
    return <p className="mb-2 last:mb-0">{children}</p>;
  },
  ul({ children }) {
    return <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>;
  },
  a({ children, href }) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-accent underline">
        {children}
      </a>
    );
  },
};

export default function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="max-w-none text-[15px] leading-relaxed [&>*:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
