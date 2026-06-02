import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CrmSettingsPage() {
  return <div className="space-y-6 p-6"><h1 className="font-semibold text-3xl tracking-tight">CRM Settings</h1><Card><CardHeader><CardTitle>API Settings</CardTitle></CardHeader><CardContent className="text-muted-foreground text-sm">Evolution API and OpenAI key forms are added in the settings actions task.</CardContent></Card></div>;
}
