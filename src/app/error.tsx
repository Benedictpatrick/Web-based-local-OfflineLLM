"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold text-foreground">Something went wrong</p>
      <p className="max-w-sm text-sm text-foreground-muted">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
