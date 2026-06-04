import { describe, expect, it } from "vitest";

import { formatWhatsAppNumber, getConversationContactLabel, getConversationSourceLabel, getGroupNameFromMetadata, getInboundSenderId, getInboundSenderName } from "./whatsapp-display";

describe("formatWhatsAppNumber", () => {
  it("formats a one-to-one WhatsApp JID as a clean phone number", () => {
    expect(formatWhatsAppNumber("628123456789@s.whatsapp.net")).toBe("628123456789");
  });

  it("returns null for group JIDs because they are not valid WhatsApp phone numbers", () => {
    expect(formatWhatsAppNumber("120363123456789@g.us")).toBeNull();
  });
});

describe("getConversationContactLabel", () => {
  it("prefers the available contact name", () => {
    expect(getConversationContactLabel({ contactName: "Jane", phone: "628123", remoteJid: "628123@s.whatsapp.net" })).toBe("Jane");
  });

  it("falls back to the WhatsApp phone number when no name is available", () => {
    expect(getConversationContactLabel({ contactName: null, phone: null, remoteJid: "628123@s.whatsapp.net" })).toBe("628123");
  });
});

describe("getGroupNameFromMetadata", () => {
  it("reads the group subject from Evolution metadata", () => {
    expect(
      getGroupNameFromMetadata({
        data: {
          key: { remoteJid: "120363123456789@g.us" },
          pushName: "Gema",
          groupMetadata: { subject: "Mocci Support Group" },
        },
      }),
    ).toBe("Mocci Support Group");
  });

  it("ignores participant push names as group names", () => {
    expect(
      getGroupNameFromMetadata({
        data: {
          key: { remoteJid: "120363123456789@g.us" },
          pushName: "Gema",
        },
      }),
    ).toBeNull();
  });
});

describe("getConversationSourceLabel", () => {
  it("shows a valid WhatsApp number for one-to-one conversations", () => {
    expect(getConversationSourceLabel({ contactName: "Jane", phone: null, remoteJid: "628123@s.whatsapp.net" })).toBe("628123");
  });

  it("shows the group source when the conversation comes from a group", () => {
    expect(getConversationSourceLabel({ contactName: "Sales Group", phone: null, remoteJid: "120363123456789@g.us" })).toBe("Grup: Sales Group");
  });
});

describe("getInboundSenderName", () => {
  it("uses contact name for direct inbound messages", () => {
    expect(getInboundSenderName({ contactName: "Jane", phone: "628123", remoteJid: "628123@s.whatsapp.net", rawMetadata: {} })).toBe("Jane");
  });

  it("falls back to phone number for direct inbound messages without a contact name", () => {
    expect(getInboundSenderName({ contactName: null, phone: null, remoteJid: "628123@s.whatsapp.net", rawMetadata: {} })).toBe("628123");
  });

  it("uses the group participant phone number for inbound group messages", () => {
    expect(
      getInboundSenderName({
        contactName: "Sales Group",
        phone: null,
        remoteJid: "120363123456789@g.us",
        rawMetadata: { data: { key: { participant: "628987654321@s.whatsapp.net" } } },
      }),
    ).toBe("628987654321");
  });

  it("uses the participant contact name when the group push name is a placeholder", () => {
    expect(
      getInboundSenderName({
        contactName: "Sales Group",
        participantContactName: "Gema",
        phone: null,
        remoteJid: "120363123456789@g.us",
        rawMetadata: {
          data: {
            key: { participant: "628987654321@s.whatsapp.net" },
            pushName: ".",
          },
        },
      }),
    ).toBe("Gema");
  });

  it("ignores placeholder push names for group messages", () => {
    expect(
      getInboundSenderName({
        contactName: "Sales Group",
        phone: null,
        remoteJid: "120363123456789@g.us",
        rawMetadata: {
          data: {
            key: { participant: "628987654321@s.whatsapp.net" },
            pushName: ".",
          },
        },
      }),
    ).toBe("628987654321");
  });
});

describe("getInboundSenderId", () => {
  it("uses the participant JID for group messages so different senders create different bubbles", () => {
    expect(
      getInboundSenderId({
        remoteJid: "120363123456789@g.us",
        rawMetadata: { data: { key: { participant: "628987654321@s.whatsapp.net" } } },
      }),
    ).toBe("628987654321@s.whatsapp.net");
  });

  it("falls back to the remote JID for direct messages", () => {
    expect(getInboundSenderId({ remoteJid: "628123@s.whatsapp.net", rawMetadata: {} })).toBe("628123@s.whatsapp.net");
  });
});
