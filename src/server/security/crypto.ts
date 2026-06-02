import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";

function decodeKey(base64Key: string) {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) throw new Error("SECRETS_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

export function encryptSecret(value: string, base64Key: string) {
  const key = decodeKey(base64Key);
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(payload: string, base64Key: string) {
  const key = decodeKey(base64Key);
  const [ivBase64, authTagBase64, encryptedBase64] = payload.split(":");
  if (!ivBase64 || !authTagBase64 || !encryptedBase64) throw new Error("Invalid encrypted secret payload");
  const decipher = createDecipheriv(algorithm, key, Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedBase64, "base64")), decipher.final()]).toString("utf8");
}

export function maskSecret(value: string) {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 3)}...${value.slice(-4)}`;
}
