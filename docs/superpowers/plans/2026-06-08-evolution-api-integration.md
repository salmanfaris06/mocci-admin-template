# Evolution API Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align WhatsApp login flow with Evolution API docs and improve instance management UX.

**Architecture:** Evolution API acts as WhatsApp gateway only. Mocci CRM owns the dashboard, contacts, inbox (webhook → DB), pipeline, AI, and analytics. Server actions proxy all Evolution calls so API keys never reach the browser.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn-style components, server actions, Evolution API v2.3.7

---

## File Structure

| File | Responsibility |
|------|----------------|
| `backend/src/evolution/client.ts` | Low-level Evolution HTTP client |
| `src/server/crm/evolution.ts` | Server-side adapter (orchestrates client calls, normalizes responses) |
| `src/app/crm/settings/actions.ts` | Server actions for WhatsApp/Evolution |
| `src/app/crm/settings/whatsapp-login-card.tsx` | WhatsApp login UI component |
| `src/app/crm/settings/whatsapp-instance-list.tsx` | **NEW** — Instance list display |
| `src/app/crm/settings/page.tsx` | Settings page layout |
| `src/server/crm/evolution.test.ts` | Tests for evolution adapter |

---

## Task 1: Fix Create Instance to Return QR

Currently `createInstance()` uses `qrcode: false`. Per Evolution docs, `qrcode: true` makes create return QR data immediately, eliminating the need for a separate connect call after create.

**Files:**
- Modify: `backend/src/evolution/client.ts` (createInstance method)
- Modify: `src/server/crm/evolution.ts` (createEvolutionInstance function)
- Modify: `src/server/crm/evolution.test.ts`

- [ ] **Step 1: Update client createInstance to use qrcode: true**

In `backend/src/evolution/client.ts`, change:

```ts
createInstance(webhookUrl?: string) {
  return this.request(
    "/instance/create",
    {
      method: "POST",
      body: JSON.stringify({
        instanceName: this.options.instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        webhook: webhookUrl
          ? {
              enabled: true,
              url: webhookUrl,
              byEvents: true,
              base64: false,
              webhookByEvents: true,
              webhookBase64: false,
              events: defaultWebhookEvents,
            }
          : undefined,
      }),
    },
    { idempotentAlreadyExistsMessage: "Instance already exists" },
  );
}
```

Only change: `qrcode: false` → `qrcode: true`.

- [ ] **Step 2: Update createEvolutionInstance to normalize QR from create response**

In `src/server/crm/evolution.ts`, update `createEvolutionInstance()`:

```ts
export async function createEvolutionInstance() {
  const settings = await getEvolutionSettings();
  const client = new EvolutionClient(settings);

  try {
    const response = await client.createInstance(settings.webhookUrl);

    if (settings.webhookUrl) {
      await client.setWebhook(settings.webhookUrl).catch(() => undefined);
    }

    return extractQrCodeData(response);
  } catch (error) {
    if (!isBrokenEvolutionInstanceError(error)) throw error;

    await client.deleteInstance();
    const response = await client.createInstance(settings.webhookUrl);
    if (settings.webhookUrl) {
      await client.setWebhook(settings.webhookUrl).catch(() => undefined);
    }
    return extractQrCodeData(response);
  }
}
```

Key change: wrap return with `extractQrCodeData()` so create returns normalized QR like connect does.

- [ ] **Step 3: Update test for createEvolutionInstance**

In `src/server/crm/evolution.test.ts`, update the mock response for create to include QR data:

```ts
.mockResolvedValueOnce(
  new Response(
    JSON.stringify({
      instance: { instanceName: "main", status: "connecting" },
      qrcode: { base64: "data:image/png;base64,test", code: "2@test", count: 1 },
    }),
    { status: 200 },
  ),
)
```

Update assertion:

```ts
await expect(createEvolutionInstance()).resolves.toMatchObject({
  code: "2@test",
  image: "data:image/png;base64,test",
});
```

- [ ] **Step 4: Run tests**

Run: `npm test -- --run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/evolution/client.ts src/server/crm/evolution.ts src/server/crm/evolution.test.ts
git commit -m "feat(evolution): create instance with qrcode:true and normalize QR response"
```

---

## Task 2: Update Server Action to Handle QR from Create

Currently `createWhatsAppInstance` server action returns raw response. Now that create returns normalized QR, the action should be consistent with `connectWhatsAppInstance`.

**Files:**
- Modify: `src/app/crm/settings/actions.ts`

- [ ] **Step 1: Verify createWhatsAppInstance action already uses safeAction**

Current code already wraps with `safeAction`. Since `createEvolutionInstance()` now returns the same shape as `connectEvolutionInstance()` (normalized QR), no change needed to the action itself.

Verify by reading the action — it already does:

```ts
export async function createWhatsAppInstance() {
  return safeAction(async () => {
    const response = await createEvolutionInstance();
    revalidatePath("/api-settings");
    revalidatePath("/crm/settings");
    return response;
  });
}
```

This now returns `{ image, code, pairingCode, raw }` — same as connect.

- [ ] **Step 2: No code change needed, move to next task**

---

## Task 3: Update WhatsApp Login Card to Show QR After Create

Currently the UI only shows QR after clicking "Get QR" (connect). Now that create also returns QR, UI should display it immediately.

**Files:**
- Modify: `src/app/crm/settings/whatsapp-login-card.tsx`

- [ ] **Step 1: Update handleCreate to display QR from create response**

Change `handleCreate`:

```ts
const handleCreate = React.useCallback(() => {
  runAction(createWhatsAppInstance, (value) => {
    const qrValue = value as QrState;
    if (qrValue.image || qrValue.code || qrValue.pairingCode) {
      setQr({ image: qrValue.image, code: qrValue.code, pairingCode: qrValue.pairingCode, raw: qrValue.raw });
    }
  });
}, [runAction]);
```

This matches the same pattern as `handleConnect`.

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: Build passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/crm/settings/whatsapp-login-card.tsx
git commit -m "feat(ui): show QR immediately after creating WhatsApp instance"
```

---

## Task 4: Add Fetch All Instances Action

Add an explicit server action for fetching all instances, separate from the combined test/status action.

**Files:**
- Modify: `src/server/crm/evolution.ts`
- Modify: `src/app/crm/settings/actions.ts`

- [ ] **Step 1: Add fetchAllInstances function to evolution adapter**

In `src/server/crm/evolution.ts`, add:

```ts
export async function fetchAllInstances() {
  const client = await getEvolutionClient();
  const instances = await client.fetchInstances();

  if (!Array.isArray(instances)) return [];

  return instances.map((instance: unknown) => {
    const name =
      getStringField(instance, ["name"]) ??
      getStringField(instance, ["instanceName"]) ??
      getStringField(instance, ["instance", "instanceName"]) ??
      getStringField(instance, ["instance", "name"]) ??
      "unknown";

    const state =
      getStringField(instance, ["instance", "state"]) ??
      getStringField(instance, ["state"]) ??
      getStringField(instance, ["connectionStatus", "state"]) ??
      getStringField(instance, ["status"]) ??
      "unknown";

    return { name, state };
  });
}
```

- [ ] **Step 2: Add refreshInstances server action**

In `src/app/crm/settings/actions.ts`, add:

```ts
export async function refreshInstances() {
  return safeAction(async () => {
    const instances = await fetchAllInstances();
    revalidatePath("/api-settings");
    revalidatePath("/crm/settings");
    return instances;
  });
}
```

Add `fetchAllInstances` to the import from `@/server/crm/evolution`.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/crm/evolution.ts src/app/crm/settings/actions.ts
git commit -m "feat(evolution): add fetchAllInstances action for instance list"
```

---

## Task 5: Create Instance List Component

Add a small component that shows available instances from Evolution API.

**Files:**
- Create: `src/app/crm/settings/whatsapp-instance-list.tsx`

- [ ] **Step 1: Create instance list component**

Create `src/app/crm/settings/whatsapp-instance-list.tsx`:

```tsx
"use client";

import { RefreshCwIcon } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { refreshInstances } from "./actions";

type Instance = { name: string; state: string };

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
          <RefreshCwIcon className={isPending ? "animate-spin" : ""} data-icon />
          Refresh
        </Button>
      </div>
      {instances.length === 0 ? (
        <p className="text-sm text-muted-foreground">No instances found.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {instances.map((instance) => (
            <li key={instance.name} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="font-mono">{instance.name}</span>
              <Badge variant={stateBadgeVariant(instance.state)}>{instance.state}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/crm/settings/whatsapp-instance-list.tsx
git commit -m "feat(ui): add WhatsApp instance list component"
```

---

## Task 6: Integrate Instance List into Settings Page

Add the instance list component to the CRM settings page.

**Files:**
- Modify: `src/app/crm/settings/page.tsx`
- Modify: `src/server/crm/evolution.ts` (make fetchAllInstances safe for unconfigured state)

- [ ] **Step 1: Add safe fetch to settings page**

In `src/app/crm/settings/page.tsx`, import and use the instance list.

Add imports:

```ts
import { fetchAllInstances } from "@/server/crm/evolution";
import { WhatsAppInstanceList } from "./whatsapp-instance-list";
```

In the `CrmSettingsPage` function, before the return, add:

```ts
const instances = evolutionConfigured
  ? await fetchAllInstances().catch(() => [])
  : [];
```

- [ ] **Step 2: Add instance list to the page layout**

Inside the `<Card>` that contains Evolution API settings (after the env status grid and before the info box), add:

```tsx
<WhatsAppInstanceList initialInstances={instances} />
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/crm/settings/page.tsx
git commit -m "feat(ui): show instance list in CRM settings page"
```

---

## Task 7: Improve WhatsApp Login Card Labels

Update button labels to match Evolution API flow terminology.

**Files:**
- Modify: `src/app/crm/settings/whatsapp-login-card.tsx`

- [ ] **Step 1: Update button labels**

Change:

| Current | New |
|---------|-----|
| `Create instance` | `Create Instance` |
| `Get QR` | `Connect / QR` |
| `Refresh status` | `Refresh Status` |
| `Disconnect` | `Logout WhatsApp` |
| `Delete instance` | `Delete Instance` |

In the JSX, update the button text strings:

```tsx
<Button disabled={isPending || isConnected} onClick={handleCreate} type="button" variant="outline">
  {isPending ? <Loader2Icon className="animate-spin" data-icon /> : <RefreshCwIcon data-icon />}
  Create Instance
</Button>
<Button disabled={isPending || isConnected} onClick={handleConnect} type="button">
  {isPending ? <Loader2Icon className="animate-spin" data-icon /> : <QrCodeIcon data-icon />}
  Connect / QR
</Button>
<Button disabled={isPending} onClick={handleRefresh} type="button" variant="secondary">
  Refresh Status
</Button>
```

And in the connected state:

```tsx
<Button disabled={isPending} onClick={handleDisconnect} size="sm" type="button" variant="secondary">
  {isPending ? <Loader2Icon className="animate-spin" data-icon /> : <LogOutIcon data-icon />}
  Logout WhatsApp
</Button>
<Button disabled={isPending} onClick={handleDelete} size="sm" type="button" variant="destructive">
  {isPending ? <Loader2Icon className="animate-spin" data-icon /> : <Trash2Icon data-icon />}
  Delete Instance
</Button>
```

- [ ] **Step 2: Update card description**

Change CardDescription from:

```tsx
<CardDescription>Create/connect your Evolution instance, then scan the QR from WhatsApp Linked devices.</CardDescription>
```

To:

```tsx
<CardDescription>Create an instance, scan the QR code from WhatsApp → Linked Devices, then monitor connection state.</CardDescription>
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/crm/settings/whatsapp-login-card.tsx
git commit -m "refactor(ui): align WhatsApp login labels with Evolution API flow"
```

---

## Task 8: Update Delete Confirmation Message

Make the delete confirmation more descriptive.

**Files:**
- Modify: `src/app/crm/settings/whatsapp-login-card.tsx`

- [ ] **Step 1: Update confirm message**

Change:

```ts
if (!window.confirm("Delete this WhatsApp instance from Evolution API? You will need to create and scan a new instance.")) return;
```

To:

```ts
if (!window.confirm("Delete this WhatsApp instance permanently? All session data will be lost and you will need to create a new instance and scan QR again.")) return;
```

- [ ] **Step 2: Commit**

```bash
git add src/app/crm/settings/whatsapp-login-card.tsx
git commit -m "refactor(ui): improve delete instance confirmation message"
```

---

## Task 9: Verify Full Flow End-to-End

Manual verification of the complete WhatsApp login flow.

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npm test -- --run`
Expected: All tests pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build passes.

- [ ] **Step 4: Manual verification checklist**

Start dev server:

```bash
npm run dev
```

Navigate to `/crm/settings` and verify:

1. [ ] Instance list shows (or "No instances" if Evolution not configured)
2. [ ] "Create Instance" button creates instance and shows QR immediately
3. [ ] "Connect / QR" button generates/refreshes QR
4. [ ] Connection state polls every 5s when not connected
5. [ ] QR auto-refreshes every 25s when displayed
6. [ ] When scanned, state transitions to "open" / Connected
7. [ ] Connected state shows number and connected time
8. [ ] "Logout WhatsApp" disconnects without deleting instance
9. [ ] "Delete Instance" shows confirm, then deletes
10. [ ] "Refresh Status" updates connection state
11. [ ] Instance list "Refresh" button updates list

- [ ] **Step 5: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: address issues found during manual verification"
```

---

## Summary of Changes

| # | Task | Risk | Effort |
|---|------|------|--------|
| 1 | Create instance with `qrcode:true` + normalize QR | Low | 10 min |
| 2 | Verify action compatibility | None | 2 min |
| 3 | Show QR after create in UI | Low | 5 min |
| 4 | Add fetchAllInstances action | Low | 10 min |
| 5 | Create instance list component | Low | 15 min |
| 6 | Integrate instance list into settings page | Low | 10 min |
| 7 | Update button labels | None | 5 min |
| 8 | Improve delete confirmation | None | 2 min |
| 9 | E2E verification | None | 15 min |

**Total estimated effort:** ~75 minutes

---

## Out of Scope (Future)

These were discussed but intentionally deferred:

- **Multi-instance selector** — Currently fixed from `EVOLUTION_INSTANCE_NAME` env. Multi-instance management needs a design for instance switching UX and which instance inbox listens to.
- **Internal API routes** — Server actions are sufficient for now. API routes only needed if we add external consumers or mobile app.
- **Inbox live fetch from Evolution** — Current webhook → DB → UI approach is better for CRM. Keep as-is.
- **Webhook/realtime inbox** — Already working via `/api/webhooks/evolution`. No changes needed.
- **Multi-tenancy** — Separate project/spec when needed.
