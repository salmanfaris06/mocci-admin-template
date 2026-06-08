export type DbMessageStatus = "received" | "sent" | "delivered" | "read" | "failed";
export type ChatMessageStatus = "sent" | "delivered" | "read" | "failed";

const STATUS_RANK: Record<DbMessageStatus, number> = {
  received: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 99,
};

export function mapAckToMessageStatus(ack: string): DbMessageStatus {
  const normalized = ack.trim().toUpperCase();
  if (normalized === "DELIVERY_ACK") return "delivered";
  if (normalized === "READ" || normalized === "PLAYED") return "read";
  if (normalized === "ERROR") return "failed";
  if (normalized === "PENDING" || normalized === "SERVER_ACK") return "sent";
  return "sent";
}

export function shouldUpdateStatus(current: string, next: DbMessageStatus): boolean {
  const currentRank = STATUS_RANK[current as DbMessageStatus] ?? 0;
  const nextRank = STATUS_RANK[next] ?? 0;
  if (next === "failed") return current !== "read";
  return nextRank >= currentRank;
}

export function toChatMessageStatus(dbStatus: string, direction: "inbound" | "outbound"): ChatMessageStatus {
  if (direction === "inbound") return "delivered";
  if (dbStatus === "delivered") return "delivered";
  if (dbStatus === "read") return "read";
  if (dbStatus === "failed") return "failed";
  return "sent";
}
