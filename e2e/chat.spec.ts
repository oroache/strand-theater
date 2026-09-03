import { test, expect } from "@playwright/test";

test("starting a chat from an example prompt shows it as a user message", async ({
  page,
}) => {
  await page.goto("/chat");

  await expect(
    page.getByRole("heading", { name: "Ask me about a movie" })
  ).toBeVisible();

  const examplePrompt = page.getByRole("button", {
    name: "Tell me about Inception",
  });
  await expect(examplePrompt).toBeVisible();

  await examplePrompt.click();

  // Sending the message removes the empty state and echoes the prompt back
  // as a user bubble immediately, independent of any assistant response.
  await expect(
    page.getByRole("heading", { name: "Ask me about a movie" })
  ).not.toBeVisible();
  await expect(page.getByText("Tell me about Inception")).toBeVisible();
});
