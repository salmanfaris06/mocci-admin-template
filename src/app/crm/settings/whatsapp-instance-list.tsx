"use client";

import { RefreshCwIcon } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { refreshInstances } from "./actions";

type Instance = {
  name: string;
  state: string;
};

type WhatsAppInstanceListProps = {
  initialInstances: Instance[];
};

function stateBadgeVariant(state: string) {
  switch (state.toLowerCase()) {
    case "open":
    case "connected":
      return "default" as const;
    case "connecting":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export function WhatsAppInstanceList({ initialInstances }: WhatsAppInstanceListProps) {
  const [instances, setInstances] = React.useState(initialInstances);
  const [isPending, startTransition] = React.useTransition();

  const handleRefresh = React.useCallback(() => {
    startTransition(() => {
      void refreshInstances().then((result) => {
        if (result.ok) setInstances(result.data);
      });
    });
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Instances</span>
        <Button disabled={isPending} onClick={handleRefresh} size="sm" type="button" variant="ghost">
          <RefreshCwIcon className={isPending ? "animate-spin" : undefined} data-icon />
          Refresh
        </Button>
      </div>
      {instances.length === 0 ? (
        <p className="text-sm text-muted-foreground">No instances found.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {instances.map((instance) => (
            <li className="flex items-center justify-between px-3 py-2 text-sm" key={instance.name}>
              <span className="font-mono">{instance.name}</span>
              <Badge variant={stateBadgeVariant(instance.state)}>{instance.state}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
