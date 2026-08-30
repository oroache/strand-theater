"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

// Distance (px) from the bottom of the scroll container within which we
// still consider the user "at the bottom" for auto-scroll purposes.
const BOTTOM_THRESHOLD_PX = 64;

// Three pulsing dots shown in place of assistant text until the first
// token of a response arrives.
function ThinkingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

const assistantBubbleClass =
  "max-w-[75%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, status, sendMessage, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const isBusy = status === "submitted" || status === "streaming";

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Kept in a ref (not just state) so the message-appended effect below
  // always reads the latest scroll position without needing to be
  // re-subscribed on every scroll event.
  const isNearBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const getIsNearBottom = (el: HTMLDivElement) =>
    el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD_PX;

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const nearBottom = getIsNearBottom(el);
    isNearBottomRef.current = nearBottom;
    if (nearBottom) setShowJumpToLatest(false);
  };

  // During active streaming the effect below can re-run (on the next
  // token) before the browser has dispatched the async 'scroll' event
  // for a manual wheel scroll, forcing scrollTop back to the bottom
  // first and making the user's scroll invisible to handleScroll by the
  // time that event finally fires. Catch upward scroll intent here
  // instead, synchronously, before the browser applies it.
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY < 0) {
      isNearBottomRef.current = false;
    }
  };

  // Runs on every message list change, including each streamed token
  // (each token replaces the assistant message with a new object).
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // Re-derive from the live DOM rather than trusting isNearBottomRef
    // alone: that ref is only refreshed by the native 'scroll' event,
    // which the browser can dispatch well after this effect re-runs on
    // the next streamed token. Relying solely on the cached value let a
    // stale "scrolled away" reading outlive the user actually having
    // scrolled back to the bottom, leaving the button stuck visible.
    const nearBottom = getIsNearBottom(el);
    isNearBottomRef.current = nearBottom;

    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
      setShowJumpToLatest(false);
    } else {
      setShowJumpToLatest(true);
    }
  }, [messages]);

  const jumpToLatest = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    isNearBottomRef.current = true;
    setShowJumpToLatest(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex flex-1 flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onWheel={handleWheel}
          className="h-full overflow-y-auto rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => {
              const hasText = message.parts.some(
                (part) => part.type === "text" && part.text.length > 0
              );
              // The response has started streaming but no text has arrived
              // yet (e.g. the model is still "thinking") — show dots in
              // place of this message's content instead of a separate bubble.
              const isPending =
                index === messages.length - 1 &&
                message.role === "assistant" &&
                status === "streaming" &&
                !hasText;

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[75%] whitespace-pre-wrap rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
                        : assistantBubbleClass
                    }
                  >
                    {isPending ? (
                      <ThinkingDots />
                    ) : (
                      <span className="animate-in fade-in duration-300">
                        {message.parts.map((part, partIndex) =>
                          part.type === "text" ? (
                            <span key={partIndex}>{part.text}</span>
                          ) : null
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Request sent, response not started yet: no assistant
                message exists in the list at all, so render a standalone
                bubble. */}
            {status === "submitted" && (
              <div className="flex justify-start">
                <div className={assistantBubbleClass}>
                  <ThinkingDots />
                </div>
              </div>
            )}
          </div>
        </div>

        {showJumpToLatest && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-md hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Jump to latest
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a movie..."
          className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-600"
        />
        {isBusy ? (
          <button
            type="button"
            onClick={() => stop()}
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
