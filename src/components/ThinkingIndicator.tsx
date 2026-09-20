"use client";

import { useEffect, useState } from "react";

/** Phases of the wait, keyed by seconds elapsed since the reply started. Local
 *  models can take a while to produce a first token, so the label gently
 *  reassures the user that it is still working rather than frozen. */
const PHASES: { after: number; label: string }[] = [
  { after: 0, label: "Thinking" },
  { after: 4, label: "Still thinking, local models can take a moment" },
  { after: 12, label: "Still working on it, this device is doing all the work" },
];

/** Shown in the assistant slot between sending a prompt and the first token
 *  arriving, for every model. Unmount it as soon as text streams in. */
export default function ThinkingIndicator() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const label = [...PHASES].reverse().find((p) => seconds >= p.after)!.label;

  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm">
      <span className="thinking-dot h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      <span className="thinking-text">{label}</span>
    </p>
  );
}
