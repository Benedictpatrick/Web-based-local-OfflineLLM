"use client";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="flex h-full min-h-full flex-col items-center justify-center gap-4 bg-[#212121] px-6 text-center text-white">
        <p className="text-lg font-semibold">Navo hit an unexpected error</p>
        <p className="max-w-sm text-sm text-white/60">
          {error.message || "Something went wrong while loading the app."}
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
