"use client";

import * as React from "react";

export type MessageNewEvent = {
  messageId: string;
  direction: "inbound" | "outbound";
  text: string;
  timestamp: string;
};

export type MessageStatusEvent = {
  messageId: string;
  evolutionMessageId?: string;
  status: string;
};

export type ConversationUpdatedEvent = {
  conversationId: string;
  lastMessageSummary: string;
  lastMessageAt: string;
  unreadCount: number;
};

type UseInboxStreamOptions = {
  enabled?: boolean;
  onMessageNew?: (event: MessageNewEvent) => void;
  onMessageStatus?: (event: MessageStatusEvent) => void;
  onConversationUpdated?: (event: ConversationUpdatedEvent) => void;
};

function readLastEventId(event: Event) {
  const messageEvent = event as MessageEvent;
  return typeof messageEvent.lastEventId === "string" && messageEvent.lastEventId ? messageEvent.lastEventId : "";
}

export function useInboxStream({
  enabled = true,
  onMessageNew,
  onMessageStatus,
  onConversationUpdated,
}: UseInboxStreamOptions) {
  const [connected, setConnected] = React.useState(false);
  const lastEventIdRef = React.useRef("");

  const onMessageNewRef = React.useRef(onMessageNew);
  const onMessageStatusRef = React.useRef(onMessageStatus);
  const onConversationUpdatedRef = React.useRef(onConversationUpdated);

  React.useEffect(() => {
    onMessageNewRef.current = onMessageNew;
    onMessageStatusRef.current = onMessageStatus;
    onConversationUpdatedRef.current = onConversationUpdated;
  }, [onConversationUpdated, onMessageNew, onMessageStatus]);

  React.useEffect(() => {
    if (!enabled) return;

    const params = new URLSearchParams();
    if (lastEventIdRef.current) params.set("since", lastEventIdRef.current);

    const source = new EventSource(`/api/crm/inbox/stream?${params.toString()}`);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    source.addEventListener("message.new", (event) => {
      const lastEventId = readLastEventId(event);
      if (lastEventId) lastEventIdRef.current = lastEventId;
      onMessageNewRef.current?.(JSON.parse(event.data) as MessageNewEvent);
    });

    source.addEventListener("message.status", (event) => {
      const lastEventId = readLastEventId(event);
      if (lastEventId) lastEventIdRef.current = lastEventId;
      onMessageStatusRef.current?.(JSON.parse(event.data) as MessageStatusEvent);
    });

    source.addEventListener("conversation.updated", (event) => {
      const lastEventId = readLastEventId(event);
      if (lastEventId) lastEventIdRef.current = lastEventId;
      onConversationUpdatedRef.current?.(JSON.parse(event.data) as ConversationUpdatedEvent);
    });

    return () => {
      source.close();
      setConnected(false);
    };
  }, [enabled]);

  return { connected };
}
