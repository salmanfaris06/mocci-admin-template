import { describe, expect, it } from "vitest";

import {
  buildContactUpdatePayload,
  hasContactChanges,
  parseTagsInput,
} from "./contact-edit";

describe("parseTagsInput", () => {
  it("splits on commas, trims, and removes blanks", () => {
    expect(parseTagsInput(" hot lead , , clinic ")).toEqual([
      "hot lead",
      "clinic",
    ]);
  });

  it("removes case-insensitive duplicates keeping first occurrence", () => {
    expect(parseTagsInput("VIP, vip, Pricing")).toEqual(["VIP", "Pricing"]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseTagsInput("   ")).toEqual([]);
  });
});

describe("buildContactUpdatePayload", () => {
  const current = { status: "new", tags: ["pricing"], notes: "old note" };

  it("includes only changed fields", () => {
    const payload = buildContactUpdatePayload(
      { status: "qualified", tagsInput: "pricing", notes: "old note" },
      current,
    );
    expect(payload).toEqual({ status: "qualified" });
  });

  it("sends notes as null when cleared", () => {
    const payload = buildContactUpdatePayload(
      { status: "new", tagsInput: "pricing", notes: "   " },
      current,
    );
    expect(payload).toEqual({ notes: null });
  });

  it("detects tag changes", () => {
    const payload = buildContactUpdatePayload(
      { status: "new", tagsInput: "pricing, vip", notes: "old note" },
      current,
    );
    expect(payload).toEqual({ tags: ["pricing", "vip"] });
  });

  it("returns an empty payload when nothing changed", () => {
    const payload = buildContactUpdatePayload(
      { status: "new", tagsInput: "pricing", notes: "old note" },
      current,
    );
    expect(payload).toEqual({});
    expect(hasContactChanges(payload)).toBe(false);
  });
});
