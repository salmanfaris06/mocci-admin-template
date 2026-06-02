# CRM AI WhatsApp Admin Dashboard Design

## Status

Approved by user during brainstorming on 2026-06-02.

## Goal

Transform the current Mocci Admin Template into a CRM admin dashboard for AI Agent WhatsApp operations while preserving the existing UI design system. The MVP supports a single business, one WhatsApp instance through Evolution API, automatic contact creation from inbound WhatsApp messages, AI auto-replies, multimodal processing, detailed token/cost tracking, and admin controls for the AI agent and API settings.

## Selected Architecture

Use a split backend architecture in one repository:

1. **Next.js Admin Dashboard**
   - Uses the existing Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, and shadcn-style component patterns.
   - Preserves the current template visual design, layout, sidebar, cards, tables, charts, Kanban style, and theme tokens.
   - Provides admin pages for Dashboard, Inbox, Contacts, Leads/Pipeline, AI Agent, Analytics, and API Settings.

2. **Node.js Backend Processor Service**
   - A standalone Node.js service in the same repo, using Fastify or Hono.
   - Receives Evolution API webhooks.
   - Normalizes contacts, conversations, and messages.
   - Runs AI auto-reply jobs, audio transcription, image understanding, WhatsApp outbound sends, retries, and usage logging.
   - Owns webhook idempotency and job processing.

3. **Supabase Postgres + Drizzle ORM**
   - Source of truth for CRM records, conversations, messages, AI configs, integration settings, pricing, usage logs, webhook events, and jobs.
   - Drizzle is the database access and migration layer.

4. **Evolution API**
   - Used only as the WhatsApp transport layer.
   - CRM logic, AI behavior, analytics, and cost tracking are implemented in this system, not delegated to Evo CRM.

5. **Vercel AI SDK**
   - Used by the backend processor for chat generation and AI provider abstraction.
   - Default provider for MVP is OpenAI. Schema/settings should remain extensible for future providers.

## Evolution API Events

The MVP should configure the instance webhook for these events:

- `QRCODE_UPDATED`
- `CONNECTION_UPDATE`
- `MESSAGES_UPSERT`
- `MESSAGES_UPDATE`
- `MESSAGES_DELETE`
- `SEND_MESSAGE`
- `PRESENCE_UPDATE`

Relevant Evolution API operations:

- Set webhook through `/webhook/instance`.
- Read webhook through `/webhook/find/[instance]`.
- Mark inbound messages read with `POST /chat/markMessageAsRead/{instanceName}`.
- Show typing with `POST /instance/setPresence/{instanceName}` using `presence: "composing"`.
- Stop/update presence with `available` or `unavailable`.
- Send outbound WhatsApp text messages through the send text message endpoint.

## AI Reply Behavior

When `MESSAGES_UPSERT` receives an inbound message:

1. Store the raw webhook event with idempotency metadata.
2. Create or update contact, conversation, and inbound message records.
3. If AI auto-reply is enabled, enqueue an AI reply job.
4. The AI reply job:
   - Marks the inbound message as read.
   - Starts WhatsApp typing with `setPresence("composing")` before AI generation begins.
   - Refreshes `composing` every 5–8 seconds while AI processing is active.
   - Enforces a maximum processing window, initially 45 seconds.
   - Processes input by modality:
     - text: direct input to chat generation,
     - media caption: include caption,
     - audio/voice note: transcribe first,
     - image: run image understanding first.
   - Builds context from the active agent prompt, recent conversation history, contact profile, and optional pipeline state.
   - Generates the reply with Vercel AI SDK and the default OpenAI provider.
   - Stores AI run details and token/cost usage logs for every AI capability used.
   - Sends the outbound WhatsApp message through Evolution API.
   - Stops presence with `available` or `unavailable`.

If the AI process times out:

- Stop typing.
- Send a short fallback message explaining the request needs more time.
- Mark the AI run as `timeout`.
- Mark the conversation as `needs_attention`.
- Persist all partial usage/error data available.

If outbound send fails:

- Mark the outbound message as `failed`.
- Keep the AI run result, but mark the send job failed.
- Mark the conversation as `needs_attention`.

## Core Data Model

### Integration and Settings

- `api_settings`
  - Evolution API base URL, instance name, encrypted API key, webhook URL/status, connection state, latest QR code payload/status.

- `ai_provider_keys`
  - Provider name, encrypted API key, active/default flags, timestamps.

- `model_pricing`
  - Provider, model ID, capability (`chat`, `vision`, `transcription`), input/output price per 1M tokens, editable override fields.

### CRM

- `contacts`
  - WhatsApp number/JID, display name, avatar URL, source, per-contact AI enabled flag, notes, tags, status.

- `conversations`
  - Contact ID, status (`open`, `resolved`, `needs_attention`), AI status (`enabled`, `disabled`, `processing`, `error`), last message summary/timestamp, unread count.

- `messages`
  - Conversation ID, Evolution message ID, direction, sender type, message type, text/caption/transcript/vision summary, raw metadata JSON, status, timestamps.

### AI Agent and Usage

- `ai_agents`
  - Name, active flag, persona/system prompt, model settings, temperature, max output tokens, default flag, timeout, typing interval, fallback timeout message.

- `ai_runs`
  - Linked inbound message, conversation, contact, agent, status, latency, error details, generated response.

- `ai_usage_logs`
  - Linked AI run and output message, provider/model, capability, input/output token counts, price snapshot, computed cost, request/response metadata.

### Pipeline

- `pipeline_stages`
  - Name, order, color. Defaults: `New Lead`, `Qualified`, `Proposal`, `Customer`, `Lost`.

- `pipeline_items`
  - Contact ID, optional conversation ID, stage ID, title, value, notes, last activity, Kanban order.

### Reliability

- `webhook_events`
  - Raw Evolution event, event type, idempotency key, status, retry count, error message.

- `jobs`
  - Job type, status, attempts, lock metadata, scheduled time, payload JSON.

## Dashboard UI

### Dashboard

Shows WhatsApp connection state, QR/connect indicator, total conversations, AI replies, needs-attention count, token usage, estimated cost, recent conversations, cost trend chart, and conversation status chart.

### Inbox

Chat-oriented CRM view:

- Left conversation list.
- Center full message thread.
- Right contact profile, AI status, and pipeline summary.
- Shows AI enabled/disabled, AI processing, customer typing/recording, read/delivery status, and token/cost per AI reply.
- Admin can disable AI per contact/conversation.

### Contacts

Automatic WhatsApp contact list with search/filter by phone, name, status, and tags. Contact profile shows phone/JID, conversations, notes, pipeline status, AI enabled flag, and token/cost summary.

### Leads/Pipeline

Kanban using default stages: New Lead, Qualified, Proposal, Customer, Lost. Cards show contact name/phone, last message, status, optional estimated value, last activity, and AI/human attention badge.

### AI Agent

MVP controls only:

- Active/inactive.
- Name/persona.
- System prompt.
- Chat model.
- Temperature.
- Max output tokens.
- Timeout.
- Typing keep-alive interval.
- Fallback timeout message.
- Optional test prompt area.

Knowledge base and AI tools/actions are not in MVP.

### Analytics

Shows global usage, cost per model, cost per capability, cost per message, AI latency, failed/timeout runs, and a detailed `ai_usage_logs` table.

### API Settings

- Evolution API: base URL, instance name, encrypted API key, test connection, webhook setup/status, QR code/current connection state.
- AI Provider Keys: encrypted OpenAI key, active provider status, extensible to other providers.
- Model Pricing: seeded defaults, editable override, input/output price per 1M tokens, capability mapping.

## Security and Secrets

- MVP has no user auth, but this is a production blocker.
- API keys are never displayed in full after saving.
- Evolution API key and AI provider keys are encrypted at rest.
- Encryption key is stored in backend environment variables, not in the database.
- `.env*` files must never be committed.
- Logs must not print API keys, authorization headers, unnecessary PII, or provider responses containing secrets.
- Mask saved keys in UI, for example `sk-...abcd`.
- Webhook endpoint should use a shared secret/header when available.
- Internal admin API should require an `ADMIN_API_TOKEN` from environment variables.
- CORS should be limited to the dashboard URL.
- Add simple rate limiting for webhook/admin routes.

## MVP Scope

### Included

- Split Next.js dashboard + Node backend processor.
- Supabase Postgres + Drizzle ORM.
- Evolution API WhatsApp transport.
- AI auto-reply.
- Text, audio transcription, and image understanding.
- Typing keep-alive with timeout.
- Read receipt behavior.
- CRM contacts, conversations, and messages.
- Pipeline Kanban.
- AI agent prompt/model settings.
- Token/cost detail per message.
- API Settings with encrypted keys and editable model pricing.

### Excluded

- Multi-tenant SaaS.
- Supabase Auth/login.
- Knowledge base/RAG.
- AI tools/actions.
- Manual contact import.
- Multiple WhatsApp instances.
- Full manual human reply workflow beyond viewing conversations and disabling AI.
- Billing/subscriptions.
- Full role permissions.

## Testing and Verification

### Unit Tests

- Webhook normalization for all supported events.
- Idempotency key generation.
- Contact/conversation/message upsert logic.
- Token/cost calculation.
- Pricing snapshot logic.
- Timeout fallback behavior.
- Secret encryption/decryption helpers.

### Integration Tests

Use mocked external APIs for:

- Evolution API send message, mark read, set presence, webhook setup/read, connection state.
- AI provider chat generation, transcription, image understanding, usage metadata handling.
- Drizzle database integration against test Postgres or Supabase local.

### Dashboard Verification

- Dashboard cards render from API data.
- Inbox list/thread/detail panel works.
- Contact profile works.
- Kanban drag/drop updates stage.
- AI Agent settings form saves values.
- Analytics tables/charts reflect usage logs.
- API Settings masks secrets and never reveals full key.

### Manual Smoke Test

1. Configure Evolution API and OpenAI key.
2. Connect WhatsApp instance.
3. Send inbound text message.
4. Confirm contact, conversation, inbound message, read receipt, typing indicator, AI reply, token/cost logs.
5. Repeat for image message, audio message, timeout simulation, and send failure simulation.
6. Verify Analytics shows per-message usage/cost.

### Required Checks Before Shipping

- `npm run lint`
- `npm run build`
- backend typecheck/test command once backend scripts exist
- migration generation check
- no secrets in git diff
- manual smoke test for webhook path

## Implementation Notes

- Use current project UI primitives before adding new components.
- Prefer server components in the dashboard unless browser interactivity is required.
- Keep backend processor boundaries explicit: Evolution client, AI client, database repositories, job processor, and domain services should be separate modules.
- During implementation, consult current local package docs/source for AI SDK APIs before writing AI code.
