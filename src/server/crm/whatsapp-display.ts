type ConversationIdentity = {
  contactName: string | null;
  phone: string | null;
  remoteJid: string;
};

type MessageIdentity = ConversationIdentity & {
  participantContactName?: string | null;
  rawMetadata: unknown;
};

type SenderIdentity = {
  remoteJid: string;
  rawMetadata: unknown;
};

function readPath(value: unknown, path: string[]) {
  let cursor = value;

  for (const segment of path) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

function readString(value: unknown, paths: string[][]) {
  for (const path of paths) {
    const result = readPath(value, path);
    if (typeof result === "string" && result.trim()) return result.trim();
  }
  return undefined;
}

export function isGroupJid(remoteJid: string) {
  return remoteJid.endsWith("@g.us");
}

export function formatWhatsAppNumber(value: string | null | undefined) {
  if (!value) return null;
  if (isGroupJid(value)) return null;

  const candidate = value.split("@")[0]?.replace(/\D/g, "") ?? "";
  return candidate || null;
}

function isMeaningfulLabel(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 && normalized !== "." && normalized !== "-";
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && isMeaningfulLabel(value))?.trim() ?? null;
}

export function getConversationContactLabel(conversation: ConversationIdentity) {
  return firstNonEmpty(conversation.contactName, formatWhatsAppNumber(conversation.phone), formatWhatsAppNumber(conversation.remoteJid), conversation.remoteJid) ?? "Unknown WhatsApp contact";
}

export function getConversationSourceLabel(conversation: ConversationIdentity) {
  if (isGroupJid(conversation.remoteJid)) {
    return `Grup: ${firstNonEmpty(conversation.contactName, conversation.remoteJid) ?? conversation.remoteJid}`;
  }

  return firstNonEmpty(formatWhatsAppNumber(conversation.phone), formatWhatsAppNumber(conversation.remoteJid), conversation.remoteJid) ?? conversation.remoteJid;
}

export function getGroupParticipantJid(rawMetadata: unknown) {
  return readString(rawMetadata, [
    ["raw", "data", "key", "participant"],
    ["raw", "data", "participant"],
    ["raw", "key", "participant"],
    ["raw", "participant"],
    ["data", "key", "participant"],
    ["data", "participant"],
    ["key", "participant"],
    ["participant"],
  ]);
}

function getPayloadPushName(rawMetadata: unknown) {
  return readString(rawMetadata, [
    ["raw", "data", "pushName"],
    ["raw", "pushName"],
    ["raw", "data", "verifiedBizName"],
    ["raw", "verifiedBizName"],
    ["raw", "data", "notifyName"],
    ["raw", "notifyName"],
    ["data", "pushName"],
    ["pushName"],
    ["data", "verifiedBizName"],
    ["verifiedBizName"],
    ["data", "notifyName"],
    ["notifyName"],
  ]);
}

export function getInboundSenderId(message: SenderIdentity) {
  if (isGroupJid(message.remoteJid)) {
    return getGroupParticipantJid(message.rawMetadata) ?? message.remoteJid;
  }

  return message.remoteJid;
}

export function getInboundSenderName(message: MessageIdentity) {
  if (isGroupJid(message.remoteJid)) {
    const participantJid = getGroupParticipantJid(message.rawMetadata);
    return firstNonEmpty(getPayloadPushName(message.rawMetadata), message.participantContactName, formatWhatsAppNumber(participantJid), participantJid, `Grup: ${message.remoteJid}`) ?? `Grup: ${message.remoteJid}`;
  }

  return getConversationContactLabel(message);
}
