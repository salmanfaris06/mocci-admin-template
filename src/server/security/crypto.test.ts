import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto";

describe("secret crypto", () => {
  it("encrypts and decrypts a secret", () => {
    const key = Buffer.alloc(32, 1).toString("base64");
    const encrypted = encryptSecret("sk-test-secret", key);
    expect(encrypted).not.toContain("sk-test-secret");
    expect(decryptSecret(encrypted, key)).toBe("sk-test-secret");
  });

  it("masks secrets", () => {
    expect(maskSecret("sk-1234567890")).toBe("sk-...7890");
  });
});
