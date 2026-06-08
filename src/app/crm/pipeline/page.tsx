import { connection } from "next/server";
import {
  MessageCircleIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletCardsIcon,
} from "lucide-react";

import { PageHeader } from "@/components/showcase";
import { StatCards } from "@/app/pages/ecommerce/stat-card";
import { getPipelineBoard } from "@/server/crm/queries";
import {
  canShowWhatsAppCrmData,
  getWhatsAppConnection,
} from "@/server/crm/whatsapp-connection";

import { WhatsAppRequiredEmptyState } from "../whatsapp-required-empty-state";
import { PipelineBoard } from "./pipeline-board";

function formatCurrency(valueCents: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(valueCents / 100);
}

export default async function PipelinePage() {
  await connection();
  const whatsAppConnection = await getWhatsAppConnection();
  const canShowPipeline = canShowWhatsAppCrmData(whatsAppConnection);
  const board = canShowPipeline ? await getPipelineBoard() : [];
  const pipelineContacts = board.reduce(
    (sum, stage) => sum + stage.items.length,
    0,
  );
  const totalValue = board.reduce(
    (sum, stage) =>
      sum +
      stage.items.reduce(
        (stageSum, item) => stageSum + (item.valueCents ?? 0),
        0,
      ),
    0,
  );
  const unreadCount = board.reduce(
    (sum, stage) =>
      sum +
      stage.items.reduce(
        (stageSum, item) =>
          stageSum + ("unreadCount" in item ? (item.unreadCount ?? 0) : 0),
        0,
      ),
    0,
  );
  const activeStages = board.filter((stage) => stage.items.length > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description="Track WhatsApp contacts from new lead to customer across your CRM stages."
      />

      <StatCards
        stats={[
          {
            label: "Pipeline contacts",
            value: String(pipelineContacts),
            icon: UsersIcon,
          },
          {
            label: "Open stages",
            value: String(activeStages),
            icon: TrendingUpIcon,
          },
          {
            label: "Unread messages",
            value: String(unreadCount),
            icon: MessageCircleIcon,
          },
          {
            label: "Pipeline value",
            value: formatCurrency(totalValue),
            icon: WalletCardsIcon,
          },
        ]}
      />

      {canShowPipeline ? (
        <>
          <PipelineBoard board={board} />

          <p className="text-muted-foreground text-xs">
            Drag cards between stages to update CRM progress. Click “Open chat”
            on a card to continue the WhatsApp conversation.
          </p>
        </>
      ) : (
        <WhatsAppRequiredEmptyState feature="pipeline" />
      )}
    </div>
  );
}
