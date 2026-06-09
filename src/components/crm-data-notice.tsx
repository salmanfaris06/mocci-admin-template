import { AlertTriangleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function CrmDataNotice({ label = "fallback data" }: { label?: string }) {
  return (
    <Alert variant="default" className="border-amber-500/30 bg-amber-500/10">
      <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle>Production CRM data unavailable</AlertTitle>
      <AlertDescription>
        Showing {label}. Check the database connection/pooler in Vercel if this
        persists.
      </AlertDescription>
    </Alert>
  );
}
