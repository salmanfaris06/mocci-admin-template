import { describe, expect, it } from "vitest";

import { getEvolutionIsFromMe } from "./evolution-message";

describe("getEvolutionIsFromMe", () => {
  it("treats boolean true as from-me", () => {
    expect(getEvolutionIsFromMe({ data: { key: { fromMe: true } } })).toBe(true);
  });

  it("treats boolean false as inbound", () => {
    expect(getEvolutionIsFromMe({ data: { key: { fromMe: false } } })).toBe(false);
  });

  it("treats string false as inbound", () => {
    expect(getEvolutionIsFromMe({ data: { key: { fromMe: "false" } } })).toBe(false);
  });

  it("treats string true as from-me", () => {
    expect(getEvolutionIsFromMe({ data: { key: { fromMe: "true" } } })).toBe(true);
  });
});
