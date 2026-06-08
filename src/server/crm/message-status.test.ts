import { describe, expect, it } from "vitest";

import { mapAckToMessageStatus, shouldUpdateStatus, toChatMessageStatus } from "./message-status";

describe("mapAckToMessageStatus", () => {
  it("maps SERVER_ACK to sent", () => {
    expect(mapAckToMessageStatus("SERVER_ACK")).toBe("sent");
  });

  it("maps DELIVERY_ACK to delivered", () => {
    expect(mapAckToMessageStatus("DELIVERY_ACK")).toBe("delivered");
  });

  it("maps READ to read", () => {
    expect(mapAckToMessageStatus("READ")).toBe("read");
  });

  it("maps ERROR to failed", () => {
    expect(mapAckToMessageStatus("ERROR")).toBe("failed");
  });

  it("defaults unknown ACK to sent", () => {
    expect(mapAckToMessageStatus("UNKNOWN")).toBe("sent");
  });
});

describe("shouldUpdateStatus", () => {
  it("allows sent → delivered", () => {
    expect(shouldUpdateStatus("sent", "delivered")).toBe(true);
  });

  it("blocks read → sent", () => {
    expect(shouldUpdateStatus("read", "sent")).toBe(false);
  });

  it("blocks delivered → sent", () => {
    expect(shouldUpdateStatus("delivered", "sent")).toBe(false);
  });

  it("allows delivered → read", () => {
    expect(shouldUpdateStatus("delivered", "read")).toBe(true);
  });
});

describe("toChatMessageStatus", () => {
  it("maps received inbound to delivered in UI", () => {
    expect(toChatMessageStatus("received", "inbound")).toBe("delivered");
  });

  it("maps sent outbound to sent in UI", () => {
    expect(toChatMessageStatus("sent", "outbound")).toBe("sent");
  });

  it("maps read outbound to read in UI", () => {
    expect(toChatMessageStatus("read", "outbound")).toBe("read");
  });
});
