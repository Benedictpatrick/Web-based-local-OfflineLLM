"use client";

import { useState } from "react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { haptic } from "@/lib/haptics";

/** Shown in Chat right when the browser hasn't granted persistent storage,
 *  since that's the moment an install actually helps: installed apps are far
 *  less likely to have their downloaded models silently evicted. */
export default function InstallBanner({ storagePersisted }: { storagePersisted: boolean | null }) {
  const { canInstall, canPromptNatively, isIOS, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (storagePersisted !== false || !canInstall || dismissed) return null;

  return (
    <div className="mx-3 mt-2 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400 sm:mx-5">
      <div className="min-w-0 flex-1">
        <p className="font-medium">Install Navo to stop losing downloads</p>
        <p className="mt-0.5 text-amber-600/80 dark:text-amber-400/80">
          {isIOS
            ? "This browser hasn't saved your model permanently. Tap Share, then \"Add to Home Screen\", so it stays put."
            : "This browser hasn't saved your model permanently. Installing the app makes it far less likely to be deleted."}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {canPromptNatively && (
          <button
            type="button"
            className="rounded-full bg-amber-500 px-3 py-1.5 font-medium text-black transition-opacity hover:opacity-90"
            onClick={() => {
              haptic("tap");
              promptInstall();
            }}
          >
            Install
          </button>
        )}
        <button
          type="button"
          aria-label="Dismiss"
          className="rounded-full p-1 text-amber-600/70 hover:text-amber-600 dark:text-amber-400/70 dark:hover:text-amber-400"
          onClick={() => {
            haptic("tap");
            setDismissed(true);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
