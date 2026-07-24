"use client";

import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";

/** A single "+" trigger that opens a small menu for the composer's less
 *  frequently-tapped actions (attach, scan, agent mode, MCP tools), instead
 *  of showing all four as permanent buttons -- see the four-button layout
 *  this replaced for why: it read as cluttered next to the always-visible
 *  mic/send pair. Modeled on ModelPicker's click-outside/Escape-to-close
 *  dropdown, but anchored to open upward since this trigger sits at the
 *  bottom of the screen. */
export default function ComposerActionsMenu({
  onAttach,
  onScan,
  attachDisabled,
  agentMode,
  onToggleAgentMode,
  agentModeDisabled,
  mcpEnabledCount,
  onOpenMcp,
  mcpDisabled,
  disabled,
}: {
  onAttach: () => void;
  onScan: () => void;
  /** Attach/scan specifically -- separate from `disabled` (which gates
   *  opening the menu at all) since a file already being read shouldn't also
   *  block toggling agent mode or opening the MCP dialog. */
  attachDisabled?: boolean;
  agentMode: boolean;
  onToggleAgentMode: () => void;
  agentModeDisabled?: boolean;
  mcpEnabledCount: number;
  onOpenMcp: () => void;
  mcpDisabled?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const hasActiveTool = agentMode || mcpEnabledCount > 0;

  function run(action: () => void) {
    haptic("tap");
    setOpen(false);
    action();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="glass-chip relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:text-foreground disabled:opacity-30 sm:h-9 sm:w-9"
        onClick={() => {
          haptic("tap");
          setOpen((o) => !o);
        }}
        disabled={disabled}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {hasActiveTool && !open && (
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-accent" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-10 mb-2 w-64 max-w-[80vw] overflow-hidden rounded-2xl border border-border bg-background py-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface disabled:opacity-40"
            onClick={() => run(onAttach)}
            disabled={attachDisabled}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-foreground-muted">
              <path
                d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Attach a file
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface disabled:opacity-40"
            onClick={() => run(onScan)}
            disabled={attachDisabled}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-foreground-muted">
              <path
                d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="2" />
            </svg>
            Scan with camera
          </button>
          <div className="my-1.5 border-t border-border" />
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={agentMode}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface disabled:opacity-40"
            onClick={() => run(onToggleAgentMode)}
            disabled={agentModeDisabled}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-foreground-muted">
              <path
                d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="min-w-0 flex-1">
              <span className="block">Auto-run code</span>
              <span className="block text-xs text-foreground-muted">
                Runs Python automatically for exact answers
              </span>
            </span>
            {agentMode && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0 text-accent">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface disabled:opacity-40"
            onClick={() => run(onOpenMcp)}
            disabled={mcpDisabled}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-foreground-muted">
              <path
                d="M9 3v4M15 3v4M6 7h12l-1 5a5 5 0 0 1-5 4h0a5 5 0 0 1-5-4L6 7z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M12 16v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="min-w-0 flex-1">
              <span className="block">Connect MCP tools</span>
              {mcpDisabled && (
                <span className="block text-xs text-foreground-muted">
                  Needs an internet connection
                </span>
              )}
            </span>
            {mcpEnabledCount > 0 && (
              <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                {mcpEnabledCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
