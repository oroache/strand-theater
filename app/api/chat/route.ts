import { google } from "@ai-sdk/google";
import {
  APICallError,
  convertToModelMessages,
  RetryError,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { MODEL_NAME, SYSTEM_PROMPT } from "./lib/config";
import { searchMovie } from "./lib/tools";

// google() reads GOOGLE_GENERATIVE_AI_API_KEY from the environment itself,
// so no key handling is needed here.

// With retries disabled below, this is normally a bare APICallError. The
// RetryError unwrap is defensive in case maxRetries is ever raised above 0
// again — streamText wraps a still-failing call's underlying error in a
// RetryError, exposing it as `lastError`.
function isRateLimitError(error: unknown): boolean {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  if (!APICallError.isInstance(cause)) return false;
  return (
    cause.statusCode === 429 || /quota|rate.?limit/i.test(cause.message)
  );
}

// Passed as `onError` to toUIMessageStreamResponse, which defaults to a
// generic "An error occurred." to avoid leaking raw provider errors to the
// client. A rate-limit/quota error gets a message containing "rate limit"
// so the client's isRateLimitError check (app/chat/page.tsx) picks it up
// and renders the amber rate-limit bubble instead of the red generic one.
function getChatErrorMessage(error: unknown): string {
  if (isRateLimitError(error)) {
    return "You're sending messages too quickly (rate limit exceeded). Please wait a moment and try again.";
  }
  return "An error occurred. Please try again.";
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google(MODEL_NAME),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: { searchMovie },
    // Allows a follow-up step after a tool call so the model can turn the
    // tool result into a text response, instead of stopping at the call.
    stopWhen: stepCountIs(5),
    // Lets the client cancel an in-flight response (e.g. a "stop" button)
    // by aborting the fetch request; streamText stops generating tokens
    // and calling the model as soon as the signal fires.
    abortSignal: req.signal,
    // Default is 2 retries with exponential backoff honoring the
    // provider's Retry-After header, which for a Gemini quota/rate-limit
    // error can be 30s+ per attempt (~90s+ total). Since no bytes reach
    // the client while a retry is pending, that silence can exceed the
    // client's idle-timeout (app/chat/lib/idle-timeout-fetch.ts), which
    // then reports a misleading "Connection lost" instead of the
    // correctly-classified rate-limit error below. Failing fast on the
    // first attempt keeps the error (and its classification) inside that
    // window; the client's "Try again" button already covers retrying.
    maxRetries: 0,
  });

  return result.toUIMessageStreamResponse({ onError: getChatErrorMessage });
}
