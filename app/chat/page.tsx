"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type InferUITools, type UIMessage } from "ai";
import { Film, Star, SearchX, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { searchMovie } from "../api/chat/lib/tools";
import { idleTimeoutFetch } from "./lib/idle-timeout-fetch";

type ChatTools = InferUITools<{ searchMovie: typeof searchMovie }>;
type ChatMessage = UIMessage<unknown, never, ChatTools>;

// Distance (px) from the bottom of the scroll container within which we
// still consider the user "at the bottom" for auto-scroll purposes.
const BOTTOM_THRESHOLD_PX = 64;

// Three pulsing dots shown in place of assistant text until the first
// token of a response arrives.
function ThinkingDots() {
  return (
    <span
      role="status"
      aria-label="Thinking"
      className="flex items-center gap-1 py-0.5"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

const assistantBubbleClass =
  "max-w-[75%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100";

// Shown while the searchMovie tool call's input is still streaming in or
// has arrived but hasn't executed yet — the title may be partial or absent.
function SearchMovieLoadingCard({ title }: { title: string | undefined }) {
  return (
    <div className="flex max-w-[75%] items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      <Film className="h-4 w-4 shrink-0 animate-pulse" />
      <span>Looking up {title ? `"${title}"` : "movie"}...</span>
    </div>
  );
}

// Successful searchMovie result: poster, title, year, and rating in a
// dedicated card distinct from the plain chat bubble.
function MovieResultCard({
  movie,
  searchedTitle,
}: {
  movie: { Title: string; Year: string; Poster: string; imdbRating: string };
  // What the user actually searched for — used as a fallback title when
  // the tool result is missing or malformed (e.g. `movie.Title` isn't a
  // real string), so the card never silently renders with no title at all.
  searchedTitle: string | undefined;
}) {
  const hasPoster = movie.Poster && movie.Poster !== "N/A";
  const displayTitle =
    typeof movie.Title === "string" && movie.Title.trim().length > 0
      ? movie.Title
      : (searchedTitle ?? "Details unavailable");

  return (
    <div className="flex w-64 max-w-[75%] gap-3 overflow-hidden rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {hasPoster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={movie.Poster}
          alt={`${displayTitle} poster`}
          className="h-24 w-16 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800">
          <Film className="h-6 w-6 text-zinc-400" />
        </div>
      )}
      <div className="flex min-w-0 flex-col justify-center gap-1">
        <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {displayTitle}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {movie.Year}
        </span>
        {movie.imdbRating && movie.imdbRating !== "N/A" && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Star className="h-3 w-3 fill-current" />
            {movie.imdbRating}
          </span>
        )}
      </div>
    </div>
  );
}

// Shown when the searchMovie tool call errors (e.g. OMDB found no match).
// Styled distinctly from both the loading card and the general chat error
// bubble so a failed lookup reads as its own thing.
function SearchMovieErrorCard({ title }: { title: string | undefined }) {
  return (
    <div className="flex max-w-[75%] items-center gap-2 rounded-lg border border-dashed border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300">
      <SearchX className="h-4 w-4 shrink-0" />
      <span>
        Couldn&apos;t find {title ? `"${title}"` : "that movie"}.
      </span>
    </div>
  );
}

// Distinguishes a rate-limit failure from other errors (network issues,
// server errors) so it can get its own visual treatment instead of the
// generic red error bubble.
function isRateLimitError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("rate limit") || lower.includes("429");
}

const EXAMPLE_PROMPTS = [
  "Tell me about Inception",
  "Recommend a good sci-fi movie",
  "What's a highly-rated movie from the 90s?",
];

// Shown before the first message is sent, in place of a blank scroll area.
function EmptyState({
  onSelectPrompt,
}: {
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <div className="flex min-h-[22rem] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Film className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Ask me about a movie
        </h2>
        <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
          I can look up ratings, posters, and details, or just talk movies
          with you.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <Film className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

const MAX_MESSAGE_LENGTH = 500;

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const { messages, status, error, sendMessage, stop, regenerate } =
    useChat<ChatMessage>({
      transport: new DefaultChatTransport({
        api: "/api/chat",
        fetch: idleTimeoutFetch,
      }),
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
  }, [messages, error]);

  const jumpToLatest = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    isNearBottomRef.current = true;
    setShowJumpToLatest(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    if (!input.trim()) {
      setValidationError("Please enter a message");
      return;
    }
    if (input.length > MAX_MESSAGE_LENGTH) {
      setValidationError(
        `Message is too long (${MAX_MESSAGE_LENGTH} characters max)`
      );
      return;
    }
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
            {messages.length === 0 && !error && (
              <EmptyState
                onSelectPrompt={(prompt) => sendMessage({ text: prompt })}
              />
            )}

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
                      <span className="flex flex-col gap-2 animate-in fade-in duration-300">
                        {message.parts.map((part, partIndex) => {
                          if (part.type === "text") {
                            return <span key={partIndex}>{part.text}</span>;
                          }
                          if (part.type === "tool-searchMovie") {
                            if (
                              part.state === "input-streaming" ||
                              part.state === "input-available"
                            ) {
                              return (
                                <SearchMovieLoadingCard
                                  key={partIndex}
                                  title={part.input?.title}
                                />
                              );
                            }
                            if (part.state === "output-available") {
                              return (
                                <MovieResultCard
                                  key={partIndex}
                                  movie={part.output}
                                  searchedTitle={part.input?.title}
                                />
                              );
                            }
                            if (part.state === "output-error") {
                              return (
                                <SearchMovieErrorCard
                                  key={partIndex}
                                  title={part.input?.title}
                                />
                              );
                            }
                            return null;
                          }
                          return null;
                        })}
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

            {/* The request failed (network error, or an error part streamed
                back from the server) — surface it instead of silently
                reverting to idle. A rate-limit failure gets its own
                amber styling so it doesn't read as a connection problem. */}
            {error && isRateLimitError(error.message || "") && (
              <div className="flex justify-start">
                <div
                  role="alert"
                  className="flex max-w-[75%] flex-col items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0" />
                    You&apos;re sending messages too quickly. Please wait a
                    moment before trying again.
                  </span>
                  <button
                    type="button"
                    onClick={() => regenerate()}
                    className="text-xs font-medium underline underline-offset-2 hover:no-underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
            {error && !isRateLimitError(error.message || "") && (
              <div className="flex justify-start">
                <div
                  role="alert"
                  className="flex max-w-[75%] flex-col items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                >
                  <span>
                    {error.message || "Something went wrong. Please try again."}
                  </span>
                  <button
                    type="button"
                    onClick={() => regenerate()}
                    className="text-xs font-medium underline underline-offset-2 hover:no-underline"
                  >
                    Try again
                  </button>
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
        {validationError && (
          <span role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
            {validationError}
          </span>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (validationError) setValidationError(null);
            }}
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
        </div>
      </form>
    </div>
  );
}
