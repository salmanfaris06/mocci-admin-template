import { DashboardPageContent } from "../../dashboard/dashboard-page-content";
import { PageHeader } from "@/components/showcase";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function CrmDashboardFallback() {
  const cards = [
    ["Contacts", "248", "Fallback CRM contacts"],
    ["Conversations", "42", "Fallback conversations"],
    ["AI Success Rate", "50%", "Fallback AI health"],
    ["Pipeline Value", "Rp 355.000", "Fallback pipeline value"],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="CRM overview is temporarily using fallback data while production data is unavailable."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([title, value, description]) => (
          <Card key={title}>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-xs">{title}</p>
              <p className="text-2xl font-semibold tracking-tight">{value}</p>
              <p className="text-muted-foreground text-xs">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default async function CrmDashboardPage() {
  try {
    return await DashboardPageContent();
  } catch (error) {
    console.warn("[crm-dashboard] failed to render dashboard content", error);
    return <CrmDashboardFallback />;
  }
}
