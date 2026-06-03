# AI Agent Playground Design

## Goal

Redesign `/ai-agent` into a two-column AI agent prompt lab. Users configure and save a system prompt in the left column, then test the assistant in a chat playground in the right column. The design uses shadcn/ui components for page structure and assistant-ui for the active chat playground.

## Route

- URL: `/ai-agent`
- The page remains a single route and does not navigate between setup and playground.
- The existing CRM shell layout remains unchanged.

## Layout

Desktop layout uses two columns:

- Left column: fixed-width system prompt setup.
- Right column: flexible assistant playground.

Mobile layout stacks the columns:

- System prompt setup first.
- Assistant playground second.

## Left Column: System Prompt Setup

The left column contains one card only. The previous prompt tips card is intentionally excluded.

### Components

Use shadcn/ui components only:

- `Card`
- `CardHeader`
- `CardTitle`
- `CardDescription`
- `CardContent`
- `CardFooter`
- `Textarea`
- `Label`
- `Button`
- `Badge`
- `Separator`

### Content

- Card title: `System Prompt`
- Card description: `Define how your CRM assistant should behave before testing it.`
- Status badge in the card header/action area:
  - `Not saved`
  - `Saved`
  - `Unsaved changes`
- Textarea label: `Instructions`
- Textarea placeholder describes a CRM WhatsApp assistant.
- Footer actions:
  - `Save Prompt`
  - `Clear`

### Behavior

- User types a system prompt.
- `Save Prompt` stores the prompt in `localStorage`.
- Saved prompt unlocks the playground on the right.
- Editing the draft after save changes the status to `Unsaved changes`.
- The playground continues to use the last saved prompt until the user saves again.
- `Clear` removes both draft and saved prompt, resets status to `Not saved`, and locks/disables the playground preview.

## Right Column: Assistant Playground

The right column always shows a chat-shaped card. It never displays a locked/ready badge.

### Before Prompt Is Saved

The playground shows a disabled chat preview:

- Card title: `Assistant Playground`
- Card description: `Save a system prompt to unlock testing.`
- Static preview bubbles:
  - Assistant: `Save your system prompt first. I’ll use it as my behavior guide.`
  - User: `Can you write a WhatsApp follow-up?`
  - Assistant muted: `Playground is waiting for your saved instructions.`
- Disabled composer with placeholder: `Save system prompt to start testing...`
- Disabled send button.

### After Prompt Is Saved

The playground becomes active:

- Card title: `Assistant Playground`
- Card description: `Test your assistant with real CRM-style prompts.`
- assistant-ui chat interface is shown.
- The chat uses the saved prompt as the assistant system instruction/context.

## assistant-ui Integration

The target implementation should use assistant-ui for the active playground chat. If no backend AI route exists yet, the first implementation can prepare the two-column gated UI and use a local/mock chat implementation that matches the intended assistant-ui shape. The active chat integration must remain isolated so it can be swapped for assistant-ui runtime/API integration later.

## Out of Scope

- No route changes.
- No database persistence.
- No prompt tips card.
- No right-column `Locked` or `Ready` badge.
- No production LLM backend unless already available.
- No changes to sidebar/navigation.

## Validation

- `npm run lint` passes with no errors.
- `npm run build` passes.
- `/ai-agent` renders as a two-column layout on desktop.
- The right playground is disabled before saving a prompt.
- Saving a prompt unlocks the right playground.
- Editing after save shows `Unsaved changes` in the left-column status badge.
