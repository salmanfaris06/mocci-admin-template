import type { ChatMessageData } from "@/components/ui/chat";

type CreateOptimisticMessageInput = {
  id: string;
  now: Date;
  senderId: string;
  senderName: string;
  text: string;
};

export function createOptimisticMessage({ id, now, senderId, senderName, text }: CreateOptimisticMessageInput): ChatMessageData {
  return {
    id,
    senderId,
    senderName,
    status: "sent",
    text,
    timestamp: now,
  };
}
