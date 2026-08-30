import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { MODEL_NAME, SYSTEM_PROMPT } from "./lib/config";
import { searchMovie } from "./lib/tools";

// google() reads GOOGLE_GENERATIVE_AI_API_KEY from the environment itself,
// so no key handling is needed here.

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
  });

  return result.toUIMessageStreamResponse();
}
