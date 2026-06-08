# State-Aware Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the CRM inbox explain WhatsApp connectivity state instead of appearing mysteriously empty when no Evolution instance is connected.

**Architecture:** The server inbox page derives a small `whatsAppConnection` view model from Evolution environment settings and `fetchAllInstances()`. The client inbox workspace uses that view model to render three UX states: no instance setup, disconnected/offline with preserved history, and connected with normal empty conversations.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, existing shadcn-style UI components.

---

## Files

- Modify: `src/app/crm/inbox/page.tsx` — derive WhatsApp connection state and pass it to the workspace.
- Modify: `src/app/crm/inbox/crm-chat-workspace.tsx` — render setup/offline/empty states and reduce refresh activity when no instance exists.

## Task 1: Add WhatsApp connection view model to inbox page

- [ ] Import `fetchAllInstances` from `@/server/crm/evolution`.
- [ ] Add a `getWhatsAppConnection()` helper that returns:
  - `{ status: "not-configured" }` when env values are missing.
  - `{ status: "no-instance", instanceName }` when target instance is not found.
  - `{ status: "connected", instanceName, state }` when state is `open` or `connected`.
  - `{ status: "disconnected", instanceName, state }` for any other known state.
  - `{ status: "unknown", instanceName }` when Evolution lookup fails.
- [ ] Pass this view model into `CrmChatWorkspace`.

## Task 2: Render state-aware inbox UX

- [ ] Add `whatsAppConnection` prop type to `CrmChatWorkspace`.
- [ ] Add a top banner when status is `disconnected` or `unknown` and existing conversations may still be visible.
- [ ] When there is no active conversation:
  - `not-configured` / `no-instance`: show setup CTA with link button to `/api-settings`.
  - `disconnected` / `unknown`: show offline explanation with link button to `/api-settings`.
  - `connected`: show normal “Belum ada percakapan” empty state.
- [ ] Disable the periodic refresh interval when status is `not-configured` or `no-instance`.

## Verification

- [ ] Run `npm run lint` and expect success.
- [ ] Run `npm run build` and expect success.
