"use client";

export interface ResearchStep {
  question: string;
  state: "pending" | "active" | "done";
}

/** Small checklist of research sub-questions in flight, rendered in the same
 *  slot Chat.tsx's single-string agentStatus occupies during agent mode --
 *  generalized to a list since research can have multiple concurrent-looking
 *  (though always sequentially run) steps. */
export default function ResearchProgress({ steps }: { steps: ResearchStep[] }) {
  if (steps.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1 text-xs">
      {steps.map((step, i) => (
        <li key={i} className="flex items-center gap-2">
          {step.state === "done" ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0 text-accent">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : step.state === "active" ? (
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" />
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full border border-border" />
          )}
          <span className={step.state === "active" ? "text-foreground" : "text-foreground-muted"}>
            {step.question}
          </span>
        </li>
      ))}
    </ul>
  );
}
