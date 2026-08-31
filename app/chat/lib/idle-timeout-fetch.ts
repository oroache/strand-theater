// A stalled connection (e.g. the network drops mid-stream) doesn't always
// reject the fetch or the response body's reader: browsers only fail a
// request outright when the underlying socket errors, which a "went
// offline after the connection was already established" scenario may
// never trigger — the reader.read() promise can simply hang forever.
// useChat only reacts to a rejected promise, so a hang like that leaves
// the UI stuck in "streaming" indefinitely. This wraps fetch so a gap of
// silence on the response stream is turned into a real rejection, mirroring
// the "failed to fetch" error path a pre-send disconnect already produces.
// Generous enough to ride out a slow searchMovie lookup or an in-between
// model step without falsely flagging a live connection as dead.
const STREAM_IDLE_TIMEOUT_MS = 20_000;

function withIdleTimeout(
  body: ReadableStream<Uint8Array>,
  timeoutMs: number
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let timeoutId: ReturnType<typeof setTimeout>;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const arm = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          reader.cancel().catch(() => {});
          controller.error(
            new Error("Connection lost. Please try again.")
          );
        }, timeoutMs);
      };

      arm();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            clearTimeout(timeoutId);
            controller.close();
            return;
          }
          arm();
          controller.enqueue(value);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        controller.error(error);
      }
    },
    cancel(reason) {
      clearTimeout(timeoutId);
      return reader.cancel(reason);
    },
  });
}

// Drop-in replacement for `fetch` that fails a request whose response
// stream goes silent for longer than STREAM_IDLE_TIMEOUT_MS.
export async function idleTimeoutFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);
  if (!response.body) return response;

  return new Response(withIdleTimeout(response.body, STREAM_IDLE_TIMEOUT_MS), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
