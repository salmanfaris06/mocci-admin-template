"use client";

import { MessageCircleIcon, SendIcon } from "lucide-react";
import * as React from "react";

import { ChatComposer, ChatMessages, ChatProvider, type ChatMessageData } from "@/components/ui/chat";

import { createOptimisticMessage } from "./optimistic-chat";

const crmUser = {
  id: "crm-agent",
  name: "CRM AI Agent",
  status: "online" as const,
};

type CrmChatThreadProps = {
  contactName: string;
  initialMessages: ChatMessageData[];
  remoteJid: string;
};

export function CrmChatThread({ contactName, initialMessages, remoteJid }: CrmChatThreadProps) {
  const [messages, setMessages] = React.useState(initialMessages);

  const handleSend = React.useCallback((text: string) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      createOptimisticMessage({
        id: `local-${Date.now()}`,
        now: new Date(),
        senderId: crmUser.id,
        senderName: crmUser.name,
        text,
      }),
    ]);
  }, []);

  return (
    <ChatProvider className="flex min-h-[720px] flex-1 flex-col bg-background" currentUser={crmUser} theme="lunar">
      <header className="flex flex-col gap-4 border-border border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
            {contactName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-lg">{contactName}</h2>
            <p className="truncate text-muted-foreground text-sm">{remoteJid}</p>
          </div>
        </div>
      </header>

      {messages.length > 0 ? (
        <ChatMessages className="min-h-0 flex-1" messages={messages} />
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div>
            <MessageCircleIcon className="mx-auto mb-3 size-10 text-muted-foreground" />
            <h3 className="font-medium">No messages in this thread</h3>
            <p className="mt-1 text-muted-foreground text-sm">Messages will appear here once this conversation has WhatsApp activity.</p>
          </div>
        </div>
      )}

      <div className="border-border border-t p-4">
        <ChatComposer
          composerBodyClassName="border-t-0 bg-transparent px-0 py-0 backdrop-blur-none backdrop-saturate-100"
          inputContainerClassName="bg-transparent"
          onSend={handleSend}
          placeholder="Type a demo reply — it will only appear locally"
        />
        <p className="mt-3 flex items-center gap-2 text-muted-foreground text-xs">
          <SendIcon className="size-3" />
          Demo mode: replies appear locally in this preview only. Connect Evolution API actions to send real WhatsApp replies.
        </p>
      </div>
    </ChatProvider>
  );
}
