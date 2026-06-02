# CRM Chatcn Inbox Design

## Goal

Replace the visual experience of `/crm/inbox` with a chat-style CRM conversation page using chatcn components installed from the official registry. The route remains `/crm/inbox` so existing links do not break, but the navigation label changes from `Inbox` to `Chat`.

## External Component Source

Install chatcn from the documented shadcn registry command:

```bash
npx shadcn@latest add https://raw.githubusercontent.com/leonickson1/chatcn/main/public/r/chat.json
```

Expected component location after install:

```txt
src/components/ui/chat/
```

The implementation should use exported chatcn primitives such as `ChatProvider`, `ChatMessages`, and `ChatComposer` when available. If the registry output differs, adapt to its actual exports while preserving the intended two-pane chat experience.

## Route and Navigation

- Keep the route path: `/crm/inbox`.
- Update CRM navigation label from `Inbox` to `Chat` while keeping `url: '/crm/inbox'`.
- Keep CRM layout shell (`src/app/crm/layout.tsx`) so the page has sidebar, navbar, breadcrumb, and footer.

## Page Layout

The page should have a dashboard-friendly two-column layout:

1. Left pane: conversation list.
   - Show contact name, latest message summary, status, and AI status.
   - Use demo data when `DATABASE_URL` is missing.
   - Highlight the currently selected demo conversation visually.

2. Right pane: chat thread.
   - Use chatcn chat provider/messages/composer components.
   - Show inbound customer messages and outbound AI/admin messages.
   - Include a small conversation header with contact name, WhatsApp phone/JID, conversation status, and AI status.
   - Composer is preview-only in this task and must not send real WhatsApp messages.

## Data Behavior

Without `DATABASE_URL`, the page must show realistic dummy chat data. This is required because the immediate goal is UI preview.

With `DATABASE_URL`, the page should use existing CRM query helpers where possible. If no conversation ID is selected, use the newest recent conversation. If thread-specific routing is not implemented yet, it is acceptable for this task to show the first conversation as the active chat.

Add or extend CRM query helpers for demo chat messages so the chat UI has enough content to validate spacing, bubbles, sender types, and timestamps.

## Send Composer Behavior

For this task, composer submit is demo-only:

- It must not call Evolution API.
- It must not write to the database.
- It may no-op, log in development, or show a small UI note that sending is not connected yet.

Real sending belongs to a later backend integration task.

## Error Handling

- Missing database configuration must not crash the page.
- Missing chatcn registry exports should be handled during implementation by inspecting installed files and adapting imports to actual exports.
- If chat messages are empty, show a friendly empty state inside the chat pane.

## Testing and Verification

- Add or update tests for CRM demo chat query behavior.
- Run `npm run lint -- --quiet`.
- Run `npm run build`.
- If chatcn install changes many files, inspect generated files for secrets or unsafe code before committing.

## Out of Scope

- Real WhatsApp outbound sending from the composer.
- Real-time updates or websocket streaming.
- Conversation selection persisted in URL/search params.
- Database migrations beyond query/demo helper changes.
