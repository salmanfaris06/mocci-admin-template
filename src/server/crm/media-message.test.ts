import { describe, expect, it, vi } from "vitest";

describe("sendValidatedMediaMessage", () => {
  it("validates media input and delegates to Evolution client", async () => {
    const client = {
      sendMediaMessage: vi.fn(async () => ({ key: { id: "media-1" } })),
    };
    const { sendValidatedMediaMessage } = await import("./media-message");
    const media = new Blob(["hello"], { type: "image/png" });

    await expect(
      sendValidatedMediaMessage(client, {
        number: "628123",
        mediatype: "image",
        media,
        caption: "Preview",
        fileName: "preview.png",
      }),
    ).resolves.toEqual({ key: { id: "media-1" } });

    expect(client.sendMediaMessage).toHaveBeenCalledWith({
      number: "628123",
      mediatype: "image",
      media,
      caption: "Preview",
      fileName: "preview.png",
    });
  });

  it("rejects invalid media type", async () => {
    const client = { sendMediaMessage: vi.fn() };
    const { sendValidatedMediaMessage } = await import("./media-message");

    await expect(
      sendValidatedMediaMessage(client, {
        number: "628123",
        mediatype: "sticker",
        media: new Blob(["hello"]),
      }),
    ).rejects.toThrow("Unsupported media type: sticker");
    expect(client.sendMediaMessage).not.toHaveBeenCalled();
  });

  it("requires document file name", async () => {
    const client = { sendMediaMessage: vi.fn() };
    const { sendValidatedMediaMessage } = await import("./media-message");

    await expect(
      sendValidatedMediaMessage(client, {
        number: "628123",
        mediatype: "document",
        media: new Blob(["hello"]),
      }),
    ).rejects.toThrow("Document media requires fileName");
  });
});
