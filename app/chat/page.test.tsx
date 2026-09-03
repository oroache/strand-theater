import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import ChatPage from "./page";

// The component talks to the API exclusively through useChat's returned
// helpers, so mocking this hook is enough to guarantee no real network
// request (and no hit to the /api/chat route handler) ever happens here.
vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(),
}));

type MockChatState = {
  messages: UIMessage[];
  status?: "submitted" | "streaming" | "ready" | "error";
  error?: Error;
};

function mockUseChat(state: MockChatState) {
  vi.mocked(useChat).mockReturnValue({
    id: "test-chat",
    setMessages: vi.fn(),
    resumeStream: vi.fn(),
    addToolResult: vi.fn(),
    addToolOutput: vi.fn(),
    addToolApprovalResponse: vi.fn(),
    clearError: vi.fn(),
    sendMessage: vi.fn(),
    stop: vi.fn(),
    regenerate: vi.fn(),
    status: "ready",
    error: undefined,
    ...state,
  } as unknown as ReturnType<typeof useChat>);
}

beforeEach(() => {
  vi.mocked(useChat).mockReset();
});

describe("ChatPage message rendering", () => {
  it("renders a user message", () => {
    mockUseChat({
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [{ type: "text", text: "Hello there" }],
        },
      ],
    });

    render(<ChatPage />);

    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("renders an assistant text message", () => {
    mockUseChat({
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [{ type: "text", text: "Inception is a 2010 sci-fi film." }],
        },
      ],
    });

    render(<ChatPage />);

    expect(
      screen.getByText("Inception is a 2010 sci-fi film.")
    ).toBeInTheDocument();
  });

  it("renders the thinking-dots state while waiting for the first token", () => {
    mockUseChat({
      messages: [{ id: "a1", role: "assistant", parts: [] }],
      status: "streaming",
    });

    render(<ChatPage />);

    expect(
      screen.getByRole("status", { name: /thinking/i })
    ).toBeInTheDocument();
  });

  it("renders a generic error with role=alert", () => {
    mockUseChat({
      messages: [],
      error: new Error("Something went wrong on the server."),
    });

    render(<ChatPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong on the server."
    );
  });

  it("renders the rate-limit error with text distinct from a generic error", () => {
    mockUseChat({
      messages: [],
      error: new Error("Rate limit exceeded (429)"),
    });

    render(<ChatPage />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/sending messages too quickly/i);
    expect(alert).not.toHaveTextContent("Rate limit exceeded (429)");
  });
});
