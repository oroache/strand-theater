"use client";

import { useEffect, useRef, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

const STATUS_LABEL: Record<Status, string> = {
  idle: "Send",
  loading: "Sending…",
  success: "Sent",
  error: "Error — retry",
};

const STATUS_BACKGROUND: Record<Status, string> = {
  idle: "bg-zinc-900 dark:bg-zinc-100",
  loading: "bg-blue-600",
  success: "bg-green-600",
  error: "bg-red-600",
};

function randomDelayMs() {
  return 800 + Math.random() * (2000 - 800);
}

export default function ButtonDemoPage() {
  const [status, setStatus] = useState<Status>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleClick() {
    if (status === "loading") return;

    setStatus("loading");
    timeoutRef.current = setTimeout(() => {
      const outcome: Status = Math.random() < 0.5 ? "success" : "error";
      setStatus(outcome);

      if (outcome === "success") {
        timeoutRef.current = setTimeout(() => setStatus("idle"), 1500);
      }
    }, randomDelayMs());
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Send Button</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Click the button. It loads for 800–2000ms, then randomly resolves to
        success (auto-resets after 1.5s) or error (stays until clicked
        again).
      </p>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleClick}
          disabled={status === "loading"}
          className={`rounded-md px-5 py-2.5 text-sm font-medium text-white dark:text-zinc-900 outline-none disabled:cursor-wait ${STATUS_BACKGROUND[status]} ${
            status === "idle"
              ? "hover:bg-zinc-700 focus-visible:bg-zinc-700 dark:hover:bg-zinc-300 dark:focus-visible:bg-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2"
              : ""
          }`}
        >
          {STATUS_LABEL[status]}
        </button>

        <span className="text-sm text-zinc-500">status: {status}</span>
      </div>
    </div>
  );
}
