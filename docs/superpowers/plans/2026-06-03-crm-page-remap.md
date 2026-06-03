# CRM Page Remap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remap CRM routes to reuse existing template pages and replace the CRM AI Agent page with a simple textarea form card.

**Architecture:** Use App Router page re-exports to keep CRM URLs while rendering existing pages. Keep `/crm/ai-agent` as a small server-rendered page using existing UI primitives.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn-style UI primitives.

---

### Task 1: Re-export Existing Pages For CRM Routes

**Files:**
- Modify: `src/app/crm/dashboard/page.tsx`
- Modify: `src/app/crm/inbox/page.tsx`
- Modify: `src/app/crm/contacts/page.tsx`
- Modify: `src/app/crm/pipeline/page.tsx`
- Modify: `src/app/crm/analytics/page.tsx`

- [ ] **Step 1: Replace CRM route implementations with re-exports**

Use these exact route mappings:

```tsx
// src/app/crm/dashboard/page.tsx
export { default } from "../../dashboard/page";
```

```tsx
// src/app/crm/inbox/page.tsx
export { default } from "../../pages/chat/page";
```

```tsx
// src/app/crm/contacts/page.tsx
export { default } from "../../pages/ecommerce/customers/page";
```

```tsx
// src/app/crm/pipeline/page.tsx
export { default } from "../../pages/kanban/page";
```

```tsx
// src/app/crm/analytics/page.tsx
export { default } from "../../analytics/page";
```

- [ ] **Step 2: Verify TypeScript route imports compile**

Run: `npm run lint`
Expected: lint completes without route import errors.

### Task 2: Replace AI Agent Page With Textarea Form Card

**Files:**
- Modify: `src/app/crm/ai-agent/page.tsx`

- [ ] **Step 1: Implement card form**

Create a server component with a card, label, textarea, helper text, and button using existing UI primitives.

- [ ] **Step 2: Verify lint**

Run: `npm run lint`
Expected: lint completes successfully.
