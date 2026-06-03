import { describe, expect, it } from "vitest";

import { createOptimisticMessage } from "./optimistic-chat";

describe("createOptimisticMessage", () => {
  it("creates a sent outbound demo message for the CRM agent", () => {
    const now = new Date("2026-06-03T00:00:00.000Z");

    const message = createOptimisticMessage({
      id: "local-1",
      now,
      senderId: "crm-agent",
      senderName: "CRM AI Agent",
      text: "Halo, kami bantu follow up ya.",
    });

    expect(message).toEqual({
      id: "local-1",
      senderId: "crm-agent",
      senderName: "CRM AI Agent",
      status: "sent",
      text: "Halo, kami bantu follow up ya.",
      timestamp: now,
    });
  });
});
