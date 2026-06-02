# CRM Chatcn Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/crm/inbox` with a chat-style CRM page using chatcn registry components while keeping the existing route.

**Architecture:** Install chatcn UI primitives under `src/components/ui/chat`, add demo conversation messages to the CRM query layer, and render a server-driven two-pane chat page. Navigation changes are limited to the CRM nav label so existing URLs keep working.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/chatcn registry components, Vitest.

---

## File Structure

- `src/components/ui/chat/*`: generated chatcn components from the official registry.
- `src/server/crm/queries.ts`: add realistic demo chat messages and return them from `getConversationMessages()` when `DATABASE_URL` is missing.
- `src/server/crm/queries.test.ts`: assert demo chat messages exist and match a selected demo conversation.
- `src/app/crm/inbox/page.tsx`: replace the simple card list with a two-pane chat UI using installed chatcn exports where available.
- `src/config/nav.ts`: change CRM nav item title from `Inbox` to `Chat` while keeping `/crm/inbox`.

---

### Task 1: Install and Inspect chatcn Components

**Files:**
- Create/Modify: `src/components/ui/chat/*`
- Modify: dependency/config files only if the registry command changes them

- [ ] **Step 1: Run the official chatcn registry install**

```bash
cd .worktrees/crm-ai-whatsapp
npx shadcn@latest add https://raw.githubusercontent.com/leonickson1/chatcn/main/public/r/chat.json
```

Expected: command succeeds and creates `src/components/ui/chat/`.

- [ ] **Step 2: Inspect generated exports**

```bash
cd .worktrees/crm-ai-whatsapp
find src/components/ui/chat -maxdepth 2 -type f -print
```

Expected: one or more generated TypeScript/TSX files are listed.

- [ ] **Step 3: Read generated chat components before importing**

```bash
cd .worktrees/crm-ai-whatsapp
sed -n '1,220p' src/components/ui/chat/index.ts 2>/dev/null || true
find src/components/ui/chat -maxdepth 1 -type f -name '*.tsx' -print -exec sed -n '1,220p' {} \;
```

Expected: identify actual exports for provider, message list, message bubble, and composer/input. If export names differ from `ChatProvider`, `ChatMessages`, and `ChatComposer`, use the actual generated names.

---

### Task 2: Add Demo Chat Query Behavior

**Files:**
- Modify: `src/server/crm/queries.test.ts`
- Modify: `src/server/crm/queries.ts`

- [ ] **Step 1: Write failing test for demo messages**

Add this test inside `describe("CRM demo data without database configuration", () => { ... })` in `src/server/crm/queries.test.ts`:

```ts
  it("returns demo chat messages for a selected demo conversation when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getConversationMessages, getRecentConversations } = await import("./queries");

    const [conversation] = await getRecentConversations(1);

    expect(conversation).toBeDefined();
    await expect(getConversationMessages(conversation.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conversationId: conversation.id,
          direction: "inbound",
          body: expect.any(String),
        }),
        expect.objectContaining({
          conversationId: conversation.id,
          direction: "outbound",
          body: expect.any(String),
        }),
      ]),
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd .worktrees/crm-ai-whatsapp
npm run test -- src/server/crm/queries.test.ts
```

Expected: fails because `getConversationMessages()` returns an empty array without `DATABASE_URL`.

- [ ] **Step 3: Add demo message data and fallback**

In `src/server/crm/queries.ts`, add a `demoMessages` record near existing demo constants and update `getConversationMessages()`:

```ts
const demoMessages = {
  "demo-conversation-1": [
    {
      id: "demo-message-1-1",
      conversationId: "demo-conversation-1",
      contactId: "demo-contact-1",
      externalMessageId: "demo-wa-1-1",
      direction: "inbound" as const,
      body: "Halo, saya tertarik paket WhatsApp automation untuk klinik. Bisa bantu jelaskan alurnya?",
      messageType: "text" as const,
      status: "read" as const,
      metadata: {},
      createdAt: new Date("2026-06-02T09:18:00.000Z"),
    },
    {
      id: "demo-message-1-2",
      conversationId: "demo-conversation-1",
      contactId: "demo-contact-1",
      externalMessageId: "demo-wa-1-2",
      direction: "outbound" as const,
      body: "Tentu Dok. Biasanya flow-nya: pasien chat WhatsApp, AI jawab FAQ, lalu lead masuk CRM untuk follow-up admin.",
      messageType: "text" as const,
      status: "delivered" as const,
      metadata: { actor: "ai" },
      createdAt: new Date("2026-06-02T09:20:00.000Z"),
    },
    {
      id: "demo-message-1-3",
      conversationId: "demo-conversation-1",
      contactId: "demo-contact-1",
      externalMessageId: "demo-wa-1-3",
      direction: "inbound" as const,
      body: "Kalau untuk 2 cabang klinik dan butuh laporan harian, bisa?",
      messageType: "text" as const,
      status: "read" as const,
      metadata: {},
      createdAt: new Date("2026-06-02T09:23:00.000Z"),
    },
    {
      id: "demo-message-1-4",
      conversationId: "demo-conversation-1",
      contactId: "demo-contact-1",
      externalMessageId: "demo-wa-1-4",
      direction: "outbound" as const,
      body: "Bisa. Saya bisa siapkan dashboard per cabang, ringkasan percakapan, dan notifikasi jika ada pasien yang perlu dibalas manusia.",
      messageType: "text" as const,
      status: "sent" as const,
      metadata: { actor: "ai" },
      createdAt: new Date("2026-06-02T09:24:00.000Z"),
    },
  ],
  "demo-conversation-2": [
    {
      id: "demo-message-2-1",
      conversationId: "demo-conversation-2",
      contactId: "demo-contact-2",
      externalMessageId: "demo-wa-2-1",
      direction: "inbound" as const,
      body: "Pagi, bisa dibantu follow up proposal kemarin? Tim saya minta estimasi timeline implementasi.",
      messageType: "text" as const,
      status: "read" as const,
      metadata: {},
      createdAt: new Date("2026-06-02T08:10:00.000Z"),
    },
    {
      id: "demo-message-2-2",
      conversationId: "demo-conversation-2",
      contactId: "demo-contact-2",
      externalMessageId: "demo-wa-2-2",
      direction: "outbound" as const,
      body: "Siap Pak Raka. Untuk CRM + WhatsApp automation biasanya 10-14 hari kerja setelah kebutuhan final disetujui.",
      messageType: "text" as const,
      status: "failed" as const,
      metadata: { actor: "ai", note: "Demo failed state" },
      createdAt: new Date("2026-06-02T08:11:00.000Z"),
    },
  ],
  "demo-conversation-3": [
    {
      id: "demo-message-3-1",
      conversationId: "demo-conversation-3",
      contactId: "demo-contact-3",
      externalMessageId: "demo-wa-3-1",
      direction: "inbound" as const,
      body: "Berapa harga setup CRM + AI agent untuk WhatsApp?",
      messageType: "text" as const,
      status: "read" as const,
      metadata: {},
      createdAt: new Date("2026-06-01T16:45:00.000Z"),
    },
    {
      id: "demo-message-3-2",
      conversationId: "demo-conversation-3",
      contactId: "demo-contact-3",
      externalMessageId: "demo-wa-3-2",
      direction: "outbound" as const,
      body: "Paket awal mulai dari Rp8,5 juta untuk setup CRM, integrasi WhatsApp, dan satu AI agent dengan knowledge base dasar.",
      messageType: "text" as const,
      status: "sent" as const,
      metadata: { actor: "ai" },
      createdAt: new Date("2026-06-01T16:46:00.000Z"),
    },
  ],
};
```

Then update:

```ts
export async function getConversationMessages(conversationId: string) {
  if (!isDatabaseConfigured()) return demoMessages[conversationId as keyof typeof demoMessages] ?? [];

  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd .worktrees/crm-ai-whatsapp
npm run test -- src/server/crm/queries.test.ts
```

Expected: all CRM query tests pass.

- [ ] **Step 5: Commit query behavior**

```bash
cd .worktrees/crm-ai-whatsapp
git add src/server/crm/queries.ts src/server/crm/queries.test.ts
git commit -m "feat: add CRM demo chat messages"
```

---

### Task 3: Replace Inbox Page with Chat UI

**Files:**
- Modify: `src/app/crm/inbox/page.tsx`

- [ ] **Step 1: Inspect actual chatcn imports**

Read the generated chat component files from Task 1 and decide imports. If components expose a single `Chat` composite, use that. If they expose lower-level parts, compose them. Do not invent imports without reading generated files.

- [ ] **Step 2: Implement server-rendered two-pane chat page**

Replace `src/app/crm/inbox/page.tsx` with a chat page that:

- imports `getConversationMessages` and `getRecentConversations` from `@/server/crm/queries`
- loads `const conversations = await getRecentConversations(50)`
- uses `const activeConversation = conversations[0]`
- loads messages with `activeConversation ? await getConversationMessages(activeConversation.id) : []`
- renders a left conversation list and right chat thread
- uses installed chatcn components where their actual export API supports it
- includes a preview-only composer with disabled submit or explicit note that sending is not connected

Required UI text:

```txt
CRM Chat
Preview WhatsApp conversations, AI replies, and follow-up context from one workspace.
Sending is preview-only in demo mode. Connect Evolution API actions to send real WhatsApp replies.
```

- [ ] **Step 3: Run TypeScript/build feedback quickly**

```bash
cd .worktrees/crm-ai-whatsapp
npm run lint -- --quiet
```

Expected: no lint errors. If imports or generated component APIs are wrong, fix the page using the actual chatcn exports.

---

### Task 4: Rename CRM Navigation Label

**Files:**
- Modify: `src/config/nav.ts`

- [ ] **Step 1: Change only the CRM nav title**

In `src/config/nav.ts`, change this CRM item:

```ts
{ title: 'Inbox', url: '/crm/inbox' },
```

to:

```ts
{ title: 'Chat', url: '/crm/inbox' },
```

Do not change `/pages/inbox` or `/pages/chat` items.

- [ ] **Step 2: Verify label search**

```bash
cd .worktrees/crm-ai-whatsapp
rg -n "title: 'Inbox', url: '/crm/inbox'|title: 'Chat', url: '/crm/inbox'" src/config/nav.ts
```

Expected: only `title: 'Chat', url: '/crm/inbox'` appears for the CRM item.

---

### Task 5: Final Verification and Commit

**Files:**
- All changed files

- [ ] **Step 1: Run focused tests**

```bash
cd .worktrees/crm-ai-whatsapp
npm run test -- src/server/crm/queries.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

```bash
cd .worktrees/crm-ai-whatsapp
npm run lint -- --quiet
```

Expected: no errors.

- [ ] **Step 3: Run production build**

```bash
cd .worktrees/crm-ai-whatsapp
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Inspect changed files**

```bash
cd .worktrees/crm-ai-whatsapp
git status --short
git diff --stat
```

Expected: chatcn UI files, CRM query/page/nav changes, and package/config changes if registry added them. No secrets, `.env`, tokens, or PII are committed.

- [ ] **Step 5: Commit UI work**

```bash
cd .worktrees/crm-ai-whatsapp
git add src/components/ui/chat src/app/crm/inbox/page.tsx src/config/nav.ts package.json package-lock.json components.json src/server/crm/queries.ts src/server/crm/queries.test.ts
git commit -m "feat: replace CRM inbox with chat UI"
```

If the registry command changed additional non-secret files, include them after inspection.

---

## Self-Review

Spec coverage:
- Route remains `/crm/inbox`: Task 3.
- CRM nav label changes to Chat: Task 4.
- chatcn official install: Task 1.
- Two-pane chat UI: Task 3.
- Demo data without database: Task 2.
- Preview-only composer: Task 3.
- Missing database does not crash: Task 2 and existing query guard.
- Verification: Task 5.

Placeholder scan: no TBD/TODO/fill-in-later placeholders. The only adaptive step is explicitly required because chatcn exports must be inspected after registry install.

Type consistency: query helpers and route imports use existing names: `getRecentConversations` and `getConversationMessages`.
