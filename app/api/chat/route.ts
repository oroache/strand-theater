import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { MODEL_NAME, SYSTEM_PROMPT } from "./lib/config";

// google() reads GOOGLE_GENERATIVE_AI_API_KEY from the environment itself,
// so no key handling is needed here.

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google(MODEL_NAME),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    // Lets the client cancel an in-flight response (e.g. a "stop" button)
    // by aborting the fetch request; streamText stops generating tokens
    // and calling the model as soon as the signal fires.
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse();
}
