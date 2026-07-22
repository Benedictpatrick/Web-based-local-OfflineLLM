"use client";

import { useEffect, useState } from "react";
import { generateOnce } from "@/lib/generation";
import { proposeClarifyingQuestion } from "@/lib/research";
import { haptic } from "@/lib/haptics";

export interface ResearchScopeAnswers {
  depth: "quick" | "deep";
  useGrounding: boolean;
  clarification?: string;
}

const DEPTH_OPTIONS: { id: "quick" | "deep"; label: string; hint: string }[] = [
  { id: "quick", label: "Quick overview", hint: "One direct pass" },
  { id: "deep", label: "Go deep", hint: "Breaks it into sub-questions" },
];

/**
 * Fixed, always-reliable scoping questions (depth + grounding) shown
 * immediately, with an optional third field that only appears if the loaded
 * model manages to propose a clean single-line clarifying question about the
 * topic itself -- see proposeClarifyingQuestion in src/lib/research.ts. If it
 * never resolves, resolves null, or resolves after the user has already
 * finished the two fixed questions, it's simply never shown; research still
 * proceeds fine without it.
 */
export default function ResearchScopeModal({
  open,
  topic,
  onClose,
  onStart,
}: {
  open: boolean;
  topic: string;
  onClose: () => void;
  onStart: (answers: ResearchScopeAnswers) => void;
}) {
  const [depth, setDepth] = useState<"quick" | "deep" | null>(null);
  const [useGrounding, setUseGrounding] = useState<boolean | null>(null);
  const [clarifyingQuestion, setClarifyingQuestion] = useState<string | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    proposeClarifyingQuestion(topic, generateOnce)
      .then((q) => {
        if (!cancelled) setClarifyingQuestion(q);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    onClose();
    setDepth(null);
    setUseGrounding(null);
    setClarifyingQuestion(null);
    setClarificationAnswer("");
  }

  function handleStart() {
    if (!depth || useGrounding === null) return;
    haptic("tap");
    onStart({ depth, useGrounding, clarification: clarificationAnswer.trim() || undefined });
    handleClose();
  }

  const canStart = depth !== null && useGrounding !== null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={handleClose}
      />
      <div
        className={`fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-2xl border border-border bg-background p-5 shadow-lg transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        inert={!open}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Scope this research</h2>
          <button
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 text-foreground-muted hover:bg-surface hover:text-foreground"
            onClick={handleClose}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-medium text-foreground-muted">How deep?</p>
            <div className="flex flex-col gap-2">
              {DEPTH_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                    depth === opt.id
                      ? "border-accent bg-accent/10"
                      : "border-border hover:bg-surface"
                  }`}
                  onClick={() => {
                    haptic("tap");
                    setDepth(opt.id);
                  }}
                >
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="block text-xs text-foreground-muted">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-foreground-muted">
              Ground it in your saved notes, memories, and any attached file?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors ${
                  useGrounding === true
                    ? "border-accent bg-accent/10"
                    : "border-border hover:bg-surface"
                }`}
                onClick={() => {
                  haptic("tap");
                  setUseGrounding(true);
                }}
              >
                Yes, use what I've saved
              </button>
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors ${
                  useGrounding === false
                    ? "border-accent bg-accent/10"
                    : "border-border hover:bg-surface"
                }`}
                onClick={() => {
                  haptic("tap");
                  setUseGrounding(false);
                }}
              >
                No, just your own knowledge
              </button>
            </div>
          </div>

          {clarifyingQuestion && (
            <div>
              <p className="mb-2 text-xs font-medium text-foreground-muted">{clarifyingQuestion}</p>
              <input
                type="text"
                value={clarificationAnswer}
                onChange={(e) => setClarificationAnswer(e.target.value)}
                placeholder="Optional — leave blank to skip"
                className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          )}

          <button
            type="button"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            disabled={!canStart}
            onClick={handleStart}
          >
            Start research
          </button>
        </div>
      </div>
    </>
  );
}
