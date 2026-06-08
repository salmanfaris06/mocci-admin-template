import { describe, expect, it, vi } from "vitest";

describe("interactive message services", () => {
  it("requires fallback text before sending buttons", async () => {
    const client = { sendButtonsMessage: vi.fn() };
    const { sendButtonsWithFallback } = await import("./interactive-messages");

    await expect(
      sendButtonsWithFallback(client, {
        number: "628123",
        text: "",
        footerText: "CRM",
        buttons: [{ buttonId: "yes", buttonText: { text: "Yes" } }],
      }),
    ).rejects.toThrow("Interactive messages require fallback text");
    expect(client.sendButtonsMessage).not.toHaveBeenCalled();
  });

  it("delegates valid buttons, list, and poll messages", async () => {
    const client = {
      sendButtonsMessage: vi.fn(async () => ({ ok: "buttons" })),
      sendListMessage: vi.fn(async () => ({ ok: "list" })),
      sendPollMessage: vi.fn(async () => ({ ok: "poll" })),
    };
    const {
      sendButtonsWithFallback,
      sendListWithFallback,
      sendPollWithFallback,
    } = await import("./interactive-messages");

    await expect(
      sendButtonsWithFallback(client, {
        number: "628123",
        text: "Choose",
        footerText: "CRM",
        buttons: [],
      }),
    ).resolves.toEqual({ ok: "buttons" });
    await expect(
      sendListWithFallback(client, {
        number: "628123",
        title: "Menu",
        description: "Choose one",
        buttonText: "Open",
        sections: [],
      }),
    ).resolves.toEqual({ ok: "list" });
    await expect(
      sendPollWithFallback(client, {
        number: "628123",
        name: "Vote",
        selectableCount: 1,
        values: ["A", "B"],
      }),
    ).resolves.toEqual({ ok: "poll" });
  });
});
