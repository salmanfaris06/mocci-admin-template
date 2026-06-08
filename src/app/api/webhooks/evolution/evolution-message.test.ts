import { describe, expect, it } from "vitest";

import { getEvolutionAckStatus, getEvolutionIsFromMe, getEvolutionMessageId } from "./evolution-message";

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

describe("getEvolutionMessageId", () => {
  it("reads key.id from data envelope", () => {
    expect(getEvolutionMessageId({ data: { key: { id: "msg-abc" } } })).toBe("msg-abc");
  });
});

describe("getEvolutionAckStatus", () => {
  it("reads status from update payload", () => {
    expect(getEvolutionAckStatus({ data: { status: "DELIVERY_ACK" } })).toBe("DELIVERY_ACK");
  });

  it("reads update.status fallback", () => {
    expect(getEvolutionAckStatus({ data: { update: { status: "READ" } } })).toBe("READ");
  });
});
