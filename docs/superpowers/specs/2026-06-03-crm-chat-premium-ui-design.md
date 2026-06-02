# CRM Chat Premium UI Design

## Goal

Improve `/crm/inbox` first as the visual anchor for the CRM product. Keep the app built on shadcn-style primitives and existing chatcn components, but raise the page from a generic admin chat layout to a premium operational WhatsApp CRM workspace.

## Skill Constraints

### shadcn

- Use installed components before custom markup.
- Keep `Card` composition where cards are used.
- Use `Badge`, `Avatar`, `Separator`, and `Empty` instead of custom equivalents when they fit.
- Use semantic tokens such as `bg-background`, `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, and `text-primary`.
- Avoid raw color utilities for semantic UI states.
- Use `gap-*`, not `space-y-*`.
- Keep Next.js RSC boundaries safe. The route page stays server-rendered; no server-to-client function props.

### gpt-taste Adaptation

This is a daily-use dashboard, not a marketing landing page, so the gpt-taste direction is adapted for product UI restraint.

<design_plan>
Python RNG Execution:
seed = len("/shadcn /gpt-taste improveUI crm chat workspace") % 11 = 3
hero_layout = "Artistic Asymmetry"; font = "Geist"; components = ["Inline Typography Images", "Horizontal Accordions", "Infinite Marquee"]
gsap = ["Image Scale & Fade Scroll", "Scrubbing Text Reveals"]

AIDA Check:
The full marketing AIDA page structure is not applied because `/crm/inbox` is an operational workspace. The adapted structure is: Navigation already exists in the CRM shell, Attention becomes an editorial workspace header, Interest becomes a dense conversation intelligence panel, Desire becomes a refined chat experience, and Action becomes a deliberate preview-only composer.

Hero Math Verification:
The page header will use a wide container and a compact editorial heading, not a landing-page H1. Target heading classes: `max-w-4xl text-3xl md:text-5xl`. This keeps the heading to 2 lines maximum on desktop. There will be no stamp icons, spam tags, raw stats block, or cheap meta-labels.

Bento Density Verification:
A small intelligence strip may be implemented as 3 equal cards in a `grid-cols-1 md:grid-cols-3` grid. 3 cards fill 3 columns exactly, leaving zero empty cells. If a denser card grid is added later, it must use `grid-flow-dense` and mathematically verified spans.

Label Sweep & Button Check:
No labels such as "SECTION 01", "QUESTION 05", or "ABOUT US" are allowed. Button and badge text must use semantic foreground/background combinations with readable contrast.
</design_plan>

### Emil Design Engineering

- Do not over-animate daily workflow UI.
- Use subtle transitions only where they provide feedback.
- Conversation rows may get `hover` feedback and `active:scale-[0.99]`, but no heavy GSAP or scroll-triggered animation on this page.
- Entry effects are unnecessary for data users open frequently.
- Any clickable row should feel responsive without delaying navigation or selection.

## Current Problem

The current page is functional but visually plain:

- Header feels like default admin copy instead of a CRM command center.
- Conversation list lacks hierarchy for urgency, contact quality, and AI state.
- Chat panel uses correct primitives but lacks depth and product identity.
- Composer preview state looks like a disabled field rather than a deliberate product state.

## Proposed Approach

Use the existing server-rendered route and existing query helpers. Refactor only the presentation of `src/app/crm/inbox/page.tsx`.

### Page Structure

1. Editorial workspace header
   - Small eyebrow text: “WhatsApp CRM workspace”.
   - Strong heading: “Turn WhatsApp conversations into qualified pipeline.”
   - Supporting copy focused on AI replies, follow-up context, and sales handoff.
   - Right-side compact operational summary using semantic cards or badges.

2. Conversation intelligence rail
   - Left pane remains the conversation list.
   - Each conversation row shows avatar/fallback, name, phone, latest message, time, status badge, and AI status badge.
   - Active row uses a clearer selected state with border and background token layering.
   - Rows use light hover/press feedback only.

3. Chat workspace
   - Keep `ChatProvider`, `ChatMessages`, and `ChatComposer`.
   - Header uses `Avatar`, name, WhatsApp JID, status badges, and concise metadata.
   - Message area remains scrollable and stable.
   - Empty state uses `Empty` if no chat messages exist.

4. Preview-only composer
   - Make preview-only state deliberate with a small explanatory panel.
   - Keep composer disabled.
   - Do not pass function props from Server Component to Client Component.
   - Explain that Evolution API actions are needed before real sending.

## Components To Use

- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardAction` where useful.
- `Badge` for status.
- `Avatar`, `AvatarFallback` for contacts.
- `Separator` for structural division instead of raw border dividers where composition allows.
- `Empty` primitives for empty states.
- Existing chatcn primitives for chat rendering.

No new registry component is required for this pass.

## Data Flow

- `CrmInboxPage` stays an async Server Component.
- It calls `getRecentConversations(50)`.
- It chooses the first conversation as active.
- It calls `getConversationMessages(activeConversation.id)`.
- It maps database/demo message data to `ChatMessageData`.
- It renders client chat components without server-passed event handlers.

## Styling Rules

- Use semantic colors only.
- Avoid raw green/blue/zinc color utilities for UI state.
- Use `gap-*` instead of `space-y-*`.
- Use `size-*` for equal dimensions.
- Icons inside shadcn buttons must use `data-icon` and no manual sizing.
- Icons outside buttons may use existing project sizing patterns, but keep them consistent.
- Do not introduce global theme tokens unless absolutely necessary.

## Motion Rules

- No GSAP on this page for now because it is a frequent-use operational workspace.
- Use CSS transitions for hover/press states only.
- Prefer exact transition properties if custom CSS is needed.
- Avoid `transition-all` if adding new interaction classes.
- No keyboard-action animations.

## Out Of Scope

- Real conversation selection via route/search params.
- Sending real WhatsApp replies.
- WebSocket updates.
- Redesigning all CRM pages in this pass.
- Installing a new shadcn preset or overwriting components.

## Acceptance Criteria

- `/crm/inbox` keeps rendering with dummy data when `DATABASE_URL` is missing.
- Sidebar still shows only CRM navigation.
- Chat composer remains preview-only and disabled.
- No Server Component function props are passed to client components.
- Page uses shadcn-style primitives where appropriate.
- Lint and build pass.

## Self-Review

- Placeholder scan: no TBD/TODO placeholders.
- Internal consistency: design keeps the operational chat route server-rendered and avoids heavy marketing-page animation.
- Scope check: focused on one route, suitable for one implementation plan.
- Ambiguity check: the first implementation pass is explicitly limited to `/crm/inbox`.
