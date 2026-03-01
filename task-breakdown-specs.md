# AI Task Breakdown SPA — Application Spec

## Overview
A frontend-only SPA that accepts a natural language instruction from the user and uses **Google Gemini 2.0 Flash** to break it down into structured, actionable tasks.

---

## Input

| Field | Details |
|---|---|
| **Textarea** | Primary instruction — min 20 chars, max 1,000 chars |
| **`.md` Upload** | Optional supporting context (e.g., PRD, README) — max 500KB, `.md` only |
| **Hierarchical Toggle** | Pre-submission toggle — off by default — influences AI prompt when enabled |

---

## AI Integration

| Property | Value |
|---|---|
| **Provider** | Google Gemini 2.0 Flash |
| **System Prompt** | Fixed, not user-configurable |
| **Response Mode** | All at once (no streaming) |
| **Output Format** | Structured JSON (enforced via prompt) |
| **Regenerate** | User can re-run the breakdown at any time |

---

## Task Model

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | Generated client-side |
| `title` | `string` | — |
| `description` | `string` | — |
| `estimatedTime` | `string` | e.g., "2 hours", "30 minutes" |
| `priority` | `low \| medium \| high` | — |
| `parentId` | `uuid \| null` | `null` for top-level tasks, populated for subtasks |

---

## Task Interactions

| Action | Behavior |
|---|---|
| **Edit** | Inline or modal — all fields editable post-generation |
| **Delete** | With confirmation dialog |
| **Reorder** | Drag and drop |

---

## Hierarchical Mode

- **Default** — flat task list (`parentId` is always `null`)
- **When toggled on** — AI returns tasks with subtasks; `parentId` populated accordingly
- Toggle is a **pre-submission** control — changing it after generation requires a re-run

---

## UX States

| State | Behavior |
|---|---|
| **Loading** | Visible thinking/loading indicator while Gemini processes |
| **Error** | Surface AI or validation errors clearly |
| **Empty** | Initial state before first submission |
| **Results** | Task list rendered post-generation |

---

## Validation Rules

| Input | Rule |
|---|---|
| Textarea | Required, min 20 chars, max 1,000 chars |
| `.md` Upload | Optional, `.md` extension enforced, max 500KB |

> Validation is enforced **client-side before** the API call is made.

---

## Export

| Property | Value |
|---|---|
| **Format** | Excel (`.xlsx`) |
| **Structure** | Flat — all tasks in a single sheet |
| **Subtask Traceability** | `parentId` column included to reference parent task |

### Excel Column Order
`id` · `parentId` · `title` · `description` · `estimatedTime` · `priority`

---

## Out of Scope
- No backend
- No database
- No authentication
- No user accounts or history
- No streaming AI response
- No voice input
- No user-configurable prompts
