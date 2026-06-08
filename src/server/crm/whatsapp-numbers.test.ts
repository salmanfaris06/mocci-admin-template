import { describe, expect, it, vi } from "vitest";

describe("validateWhatsAppNumbers", () => {
  it("formats Indonesian numbers, batches requests, and returns validity", async () => {
    const client = {
      checkWhatsAppNumbers: vi
        .fn()
        .mockResolvedValueOnce([{ number: "6281234567890", exists: true }])
        .mockResolvedValueOnce([{ number: "6289999999999", exists: false }]),
    };
    const { validateWhatsAppNumbers } = await import("./whatsapp-numbers");

    await expect(
      validateWhatsAppNumbers(client, ["0812-3456-7890", "+62 899 9999 9999"], {
        batchSize: 1,
      }),
    ).resolves.toEqual([
      { input: "0812-3456-7890", number: "6281234567890", exists: true },
      { input: "+62 899 9999 9999", number: "6289999999999", exists: false },
    ]);

    expect(client.checkWhatsAppNumbers).toHaveBeenCalledTimes(2);
    expect(client.checkWhatsAppNumbers).toHaveBeenNthCalledWith(1, [
      "6281234567890",
    ]);
    expect(client.checkWhatsAppNumbers).toHaveBeenNthCalledWith(2, [
      "6289999999999",
    ]);
  });

  it("rejects invalid phone numbers before calling Evolution", async () => {
    const client = { checkWhatsAppNumbers: vi.fn() };
    const { validateWhatsAppNumbers } = await import("./whatsapp-numbers");

    await expect(validateWhatsAppNumbers(client, ["abc"])).rejects.toThrow(
      "Invalid WhatsApp number: abc",
    );
    expect(client.checkWhatsAppNumbers).not.toHaveBeenCalled();
  });
});
