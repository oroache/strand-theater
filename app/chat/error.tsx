"use client"; // Error boundaries must be Client Components

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function ChatError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-zinc-200 p-10 text-center dark:border-zinc-800">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </span>
      <h2 className="text-lg font-semibold tracking-tight">
        Chat couldn&apos;t load
      </h2>
      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Something went wrong while loading this conversation. You can try
        again.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
