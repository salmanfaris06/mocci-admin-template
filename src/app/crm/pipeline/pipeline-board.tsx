"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";

import { PipelineColumn } from "./column";
import { PipelineContactCard, type PipelineItem, type PipelineStage } from "./contact-card";

type PipelineBoardProps = {
  board: PipelineStage[];
};

export function PipelineBoard({ board }: PipelineBoardProps) {
  const [stages, setStages] = useState(board);
  const [activeItem, setActiveItem] = useState<PipelineItem | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const itemStageMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const stage of stages) {
      for (const item of stage.items) map.set(item.id, stage.id);
    }
    return map;
  }, [stages]);

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "pipeline-item") {
      setActiveItem(event.active.data.current.item as PipelineItem);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const fromStageId = itemStageMap.get(activeId);
    const overStage = stages.find((stage) => stage.id === overId);
    const toStageId = overStage?.id ?? itemStageMap.get(overId);

    if (!fromStageId || !toStageId || fromStageId === toStageId) return;

    const previousStages = stages;
    setStages((currentStages) => {
      const movingItem = currentStages.flatMap((stage) => stage.items).find((item) => item.id === activeId);
      if (!movingItem) return currentStages;
      return currentStages.map((stage) => {
        if (stage.id === fromStageId) return { ...stage, items: stage.items.filter((item) => item.id !== activeId) };
        if (stage.id === toStageId) return { ...stage, items: [{ ...movingItem, stageId: toStageId }, ...stage.items] };
        return stage;
      });
    });

    startTransition(() => {
      fetch(`/api/crm/pipeline/items/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: toStageId, position: 0 }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to update pipeline stage");
          toast.success("Pipeline updated", { description: "Contact moved to the selected stage." });
        })
        .catch(() => {
          setStages(previousStages);
          toast.error("Pipeline update failed", { description: "The card was moved back to its previous stage." });
        });
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stages.map((stage) => (
          <PipelineColumn key={stage.id} stage={stage} />
        ))}
      </div>

      <DragOverlay>{activeItem ? <PipelineContactCard item={activeItem} isOverlay /> : null}</DragOverlay>
    </DndContext>
  );
}
