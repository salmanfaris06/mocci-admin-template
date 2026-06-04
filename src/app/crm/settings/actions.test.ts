import { describe, expect, it } from "vitest";

import { publicError } from "./errors";

describe("settings action publicError", () => {
  it("does not misclassify Evolution authentication failures as encryption failures", () => {
    const error = new Error('Evolution API request failed 401: {"status":401,"error":"Unauthorized","response":{"message":"The apikey is invalid or cannot authenticate"}}');

    expect(publicError(error)).toBe('Evolution API request failed 401: {"status":401,"error":"Unauthorized","response":{"message":"The apikey is invalid or cannot authenticate"}}');
  });

  it("still reports real decrypt failures as encryption failures", () => {
    expect(publicError(new Error("Unsupported state or unable to authenticate data"))).toBe(
      "Saved Evolution API key cannot be decrypted in this environment. Use the same SECRETS_ENCRYPTION_KEY as the environment that saved it, or re-save the API key in production.",
    );
  });
});
