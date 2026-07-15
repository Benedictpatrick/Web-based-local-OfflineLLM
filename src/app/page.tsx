"use client";

import { useState } from "react";
import Chat from "@/components/Chat";
import Journal from "@/components/Journal";

export default function Home() {
  const [tab, setTab] = useState<"chat" | "journal">("chat");

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="9" r="4.5" fill="currentColor" />
              <rect x="6.5" y="16" width="11" height="4" rx="2" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-sm font-medium">Offline Companion</h1>
        </div>
        <nav className="flex gap-0.5 rounded-full bg-surface p-0.5 text-sm">
          <button
            className={`rounded-full px-3.5 py-1.5 transition-colors ${
              tab === "chat"
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
            onClick={() => setTab("chat")}
          >
            Chat
          </button>
          <button
            className={`rounded-full px-3.5 py-1.5 transition-colors ${
              tab === "journal"
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
            onClick={() => setTab("journal")}
          >
            Journal
          </button>
        </nav>
      </header>
      <main className="min-h-0 flex-1">
        {/* Both stay mounted so Chat keeps its loaded-model state when you
            switch to Journal and back — unmounting it would lose that
            component-local status even though the model stays in memory. */}
        <div className={tab === "chat" ? "h-full" : "hidden"}>
          <Chat />
        </div>
        <div className={tab === "journal" ? "h-full" : "hidden"}>
          <Journal />
        </div>
      </main>
    </div>
  );
}
