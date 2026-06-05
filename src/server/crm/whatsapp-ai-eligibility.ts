import { isGroupJid } from "./whatsapp-display";

type WhatsAppAiReplyEligibilityInput = {
  fromMe: boolean;
  inboundMessageInserted: boolean;
  remoteJid: string;
};

export type WhatsAppAiReplyEligibility =
  | { shouldReply: true; reason: "eligible" }
  | { shouldReply: false; reason: "from-me" | "duplicate-message" | "group-chat" };

export function getWhatsAppAiReplyEligibility(input: WhatsAppAiReplyEligibilityInput): WhatsAppAiReplyEligibility {
  if (input.fromMe) return { shouldReply: false, reason: "from-me" };
  if (!input.inboundMessageInserted) return { shouldReply: false, reason: "duplicate-message" };
  if (isGroupJid(input.remoteJid)) return { shouldReply: false, reason: "group-chat" };
  return { shouldReply: true, reason: "eligible" };
}
