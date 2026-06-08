"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { PipelineContactCard, type PipelineStage } from "./contact-card";

type PipelineColumnProps = {
  stage: PipelineStage;
};

const colorClassName: Record<string, string> = {
  blue: "bg-sky-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  red: "bg-rose-500",
};

function formatCurrency(valueCents: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(valueCents / 100);
}

export function PipelineColumn({ stage }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "stage", stage },
  });
  const totalValue = stage.items.reduce((sum, item) => sum + (item.valueCents ?? 0), 0);
  const unreadCount = stage.items.reduce((sum, item) => sum + ("unreadCount" in item ? item.unreadCount ?? 0 : 0), 0);

  return (
    <Card
      ref={setNodeRef}
      className={cn("flex min-h-[560px] flex-col gap-3 rounded-xl border-dashed p-3 transition-colors", isOver && "border-primary/60 bg-primary/5")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", colorClassName[stage.color] ?? "bg-muted-foreground")} />
            <h2 className="font-medium text-sm">{stage.name}</h2>
          </div>
          <p className="mt-1 text-muted-foreground text-xs">
            {stage.items.length} contacts · {formatCurrency(totalValue)}
          </p>
          {unreadCount > 0 ? <p className="text-primary text-xs">{unreadCount} unread messages</p> : null}
        </div>
        <Button variant="ghost" size="icon" className="size-7" aria-label={`Add contact to ${stage.name}`} disabled>
          <PlusIcon className="size-3.5" />
        </Button>
      </div>

      <SortableContext items={stage.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-3">
          {stage.items.length > 0 ? (
            stage.items.map((item) => <PipelineContactCard key={item.id} item={item} />)
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/20 p-4 text-center text-muted-foreground text-xs">
              No contacts in {stage.name}. Drag a contact here when it reaches this stage.
            </div>
          )}
        </div>
      </SortableContext>
    </Card>
  );
}
