import { describe, expect, it, vi } from "vitest";

describe("sendMessageReaction", () => {
  it("requires a complete original message key", async () => {
    const client = { sendReaction: vi.fn() };
    const { sendMessageReaction } = await import("./message-reactions");

    await expect(
      sendMessageReaction(client, {
        reactionKey: { remoteJid: "628123@s.whatsapp.net", fromMe: false },
        reactionMessage: "👍",
      }),
    ).rejects.toThrow("Reaction requires original message key");
    expect(client.sendReaction).not.toHaveBeenCalled();
  });

  it("delegates valid reactions to Evolution", async () => {
    const client = { sendReaction: vi.fn(async () => ({ ok: true })) };
    const { sendMessageReaction } = await import("./message-reactions");

    await expect(
      sendMessageReaction(client, {
        reactionKey: {
          remoteJid: "628123@s.whatsapp.net",
          fromMe: false,
          id: "msg-1",
        },
        reactionMessage: "👍",
      }),
    ).resolves.toEqual({ ok: true });

    expect(client.sendReaction).toHaveBeenCalledWith({
      reactionKey: {
        remoteJid: "628123@s.whatsapp.net",
        fromMe: false,
        id: "msg-1",
      },
      reactionMessage: "👍",
    });
  });
});
