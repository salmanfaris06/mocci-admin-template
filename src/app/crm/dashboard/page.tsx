import { CrmDashboardFallback } from "@/components/crm-dashboard-fallback";
import { DashboardPageContent } from "@/components/crm-dashboard-page-content";

export const dynamic = "force-dynamic";

export default async function CrmDashboardPage() {
  try {
    return await DashboardPageContent();
  } catch (error) {
    console.warn("[crm-dashboard] failed to render dashboard content", error);
    return <CrmDashboardFallback />;
  }
}
