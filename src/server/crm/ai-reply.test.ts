import { describe, expect, it } from "vitest";

import { getWhatsAppAiReplyEligibility } from "./whatsapp-ai-eligibility";

describe("getWhatsAppAiReplyEligibility", () => {
  it("skips group messages because auto-reply is personal-chat only", () => {
    expect(getWhatsAppAiReplyEligibility({ fromMe: false, inboundMessageInserted: true, remoteJid: "6283891820323-1632843666@g.us" })).toEqual({ shouldReply: false, reason: "group-chat" });
  });

  it("allows new inbound personal messages", () => {
    expect(getWhatsAppAiReplyEligibility({ fromMe: false, inboundMessageInserted: true, remoteJid: "628123456789@s.whatsapp.net" })).toEqual({ shouldReply: true, reason: "eligible" });
  });
});
