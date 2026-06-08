import Link from "next/link";
import { MessageCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function WhatsAppRequiredEmptyState({
  feature,
}: {
  feature: "contacts" | "pipeline";
}) {
  const featureLabel = feature === "contacts" ? "contacts" : "pipeline";

  return (
    <Empty className="border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageCircleIcon />
        </EmptyMedia>
        <EmptyTitle>Connect WhatsApp terlebih dahulu</EmptyTitle>
        <EmptyDescription>
          Data {featureLabel} akan muncul otomatis setelah WhatsApp terhubung
          dan pesan masuk melalui webhook.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild size="sm">
          <Link href="/api-settings">Connect WhatsApp</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
