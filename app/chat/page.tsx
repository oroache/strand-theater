"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex flex-1 flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>

      <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
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

          {/* Request sent, response not started yet: no assistant message
              exists in the list at all, so render a standalone bubble. */}
          {status === "submitted" && (
            <div className="flex justify-start">
              <div className={assistantBubbleClass}>
                <ThinkingDots />
              </div>
            </div>
          )}
        </div>
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
