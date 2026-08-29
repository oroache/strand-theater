// Shared configuration for the chat feature.
// Consumed by the route handler at app/api/chat/route.ts, which passes
// MODEL_NAME to the @ai-sdk/google provider and SYSTEM_PROMPT to
// streamText/generateText as the `system` option.

// Gemini model used for chat completions. Centralized here so the model
// can be swapped (e.g. for a newer Gemini version) in one place.
// Note: gemini-2.0-flash was retired by Google; gemini-3.6-flash is its
// suggested replacement (confirmed available via the models.list API).
export const MODEL_NAME = "gemini-3.6-flash";

// System prompt establishing the assistant's persona and scope for every
// chat request. Sent as the `system` message alongside the user's messages.
export const SYSTEM_PROMPT =
  "You are a helpful assistant for Strand Theater, a movie search app. " +
  "Help users find movies, discuss films, and answer questions about cinema.";
