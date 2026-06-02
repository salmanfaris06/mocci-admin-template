import { describe, expect, it } from "vitest";
import { createWebhookIdempotencyKey, normalizeEvolutionMessage } from "./normalizers";

describe("Evolution normalizers", () => {
  it("creates a stable idempotency key", () => {
    const payload = { event: "MESSAGES_UPSERT", instance: "main", data: { key: { id: "abc" } } };
    expect(createWebhookIdempotencyKey(payload)).toBe("main:MESSAGES_UPSERT:abc");
  });

  it("normalizes a text message", () => {
    const message = normalizeEvolutionMessage({ key: { id: "msg-1", remoteJid: "628123@s.whatsapp.net", fromMe: false }, pushName: "Jane", message: { conversation: "Halo" }, messageTimestamp: 1710000000 });
    expect(message).toMatchObject({ evolutionMessageId: "msg-1", remoteJid: "628123@s.whatsapp.net", displayName: "Jane", direction: "inbound", senderType: "customer", messageType: "text", text: "Halo" });
  });

  it("normalizes image caption and audio messages", () => {
    const image = normalizeEvolutionMessage({
      key: { id: "img-1", remoteJid: "628123@s.whatsapp.net", fromMe: false },
      message: { imageMessage: { caption: "Ini gambar produk" } },
    });
    expect(image).toMatchObject({ messageType: "image", caption: "Ini gambar produk" });

    const audio = normalizeEvolutionMessage({
      key: { id: "aud-1", remoteJid: "628123@s.whatsapp.net", fromMe: false },
      message: { audioMessage: { seconds: 4 } },
    });
    expect(audio).toMatchObject({ messageType: "audio" });
  });
});
