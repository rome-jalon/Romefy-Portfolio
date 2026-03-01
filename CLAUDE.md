# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Romefy Portfolio** is a portfolio platform hosted at `portfolio.romefy.com`. It showcases interactive web application projects through a gallery landing page. Each project runs as a standalone app with its own full-screen layout, linked back to the portfolio via a "Back to Portfolio" button.

The first showcased project is the **Meal Nutrition Planner** (`/nutrition`), a 3-stage app for uploading meal plans, configuring nutritional goals, and viewing per-meal analysis with PDF export.

Full specification lives in `meal-nutrition-planner-specs.md`.

## Mandatory: Use Context7 Before Writing Code

Before writing or modifying any code, **always** query the Context7 MCP server (`mcp__context7__resolve-library-id` then `mcp__context7__query-docs`) to look up current API usage, syntax, and best practices for the relevant library. Do not assume knowledge of any framework, library, or tool in the stack — always verify against Context7 first. This applies to every technology used in this project (Vue 3, Vue Router, Vite, Tailwind, Chart.js, vue-chartjs, html2canvas, jsPDF, Axios, etc.).

## Mandatory: Use Frontend Design Skill for UI Work

When building or modifying any frontend components, pages, or UI layouts, **always** invoke the `frontend-design` skill before writing code. This ensures production-grade, visually polished interfaces that avoid generic AI aesthetics.

## Styling Rules

- **No inline styles.** Never use Tailwind utility classes directly in `.vue` templates. All styling must be defined as CSS classes in `src/assets/main.css` and referenced by class name in templates.
- **Single stylesheet.** `src/assets/main.css` is the sole source of all styles. No `<style>` blocks in `.vue` files, no scoped CSS, no inline `style` attributes.
- **Dark theme.** The application uses a dark color scheme. All backgrounds, surfaces, cards, and text colors must follow the dark palette defined in the theme. No light/white backgrounds.

## Routing

The app uses **Vue Router 4** for top-level navigation between the portfolio gallery and individual projects:

| Route          | Purpose                                  |
|----------------|------------------------------------------|
| `/`            | Portfolio gallery — project card grid    |
| `/nutrition`   | Meal Nutrition Planner (standalone app)  |
| `/:catchAll`   | 404 Not Found page                       |

**Within each project**, internal navigation (like the Nutrition app's 3 stages) is handled by conditional rendering in the project's own Pinia store — **not** by sub-routes. The URL stays at the project route (e.g., `/nutrition`) while stage transitions happen via `v-if` on `currentStage`.

## Tech Stack

- **Framework:** Vue.js 3 (Composition API) + TypeScript
- **Routing:** Vue Router 4
- **State:** Pinia
- **Build:** Vite
- **Styling:** Tailwind CSS (classes defined in `src/assets/main.css` only — no utility classes in templates)
- **Charts:** Chart.js + vue-chartjs
- **PDF:** html2canvas + jsPDF
- **HTTP:** Axios
- **API:** USDA FoodData Central

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Lint
npm run type-check # TypeScript type checking
```

## Architecture

### Portfolio Shell

- **Gallery page** (`/`) — Responsive grid of project cards. Reads from a central project registry (`src/config/projects.ts`) so adding a new project only requires a config entry + route + view.
- **Standalone projects** — Each project owns its full-screen layout. A small "Back to Portfolio" link in the project's header is the only connection to the portfolio shell.
- **404 page** — Catches unknown routes with a link back to the gallery.

### Project Registry

`src/config/projects.ts` exports an array of project definitions:
```ts
{ id, title, description, tags, icon, route }
```
The gallery auto-renders cards from this registry. To add a project: register it in the config, add a route, and build its views.

### Nutrition App (`/nutrition`)

#### Three-Stage Flow

1. **Upload** — Drag-and-drop JSON file, validate against fixed schema, preview as table. Blocks Stage 2 until valid.
2. **Configure Goals** — Set calorie target (500–10,000), macro split (protein/carbs/fat must sum to 100%), and threshold alerts (sodium max, sugar max, fiber min).
3. **Dashboard** — Fetches nutrition data from USDA API, renders KPI cards, charts, per-meal tables, threshold alerts, timeline, and PDF export.

State flows linearly: `MealPlan` → Stage 2 → `NutritionGoals` → Stage 3. Back navigation preserves state. Stage switching is driven by `currentStage` in the Pinia store — no sub-routes involved.

#### Key Services

- **usda-api** — Queries `https://api.nal.usda.gov/fdc/v1/foods/search`, auto-selects first result, extracts per-100g values, scales to user quantity. Caches in-memory. Retries with exponential backoff (max 3).
- **nutrition-calculator** — Unit conversions (oz=28.35g, cup=240g, tbsp=15g, tsp=5g, piece=USDA serving or 100g fallback), macro gram calculations.
- **json-validator** — Validates meal plan schema with line-level error specificity.
- **pdf-export** — Captures dashboard at 2x resolution via html2canvas, composes A4 landscape PDF via jsPDF.

#### USDA Nutrient IDs

Calories=1008, Protein=1003, Fat=1004, Carbs=1005, Fiber=1079, Sugar=2000, Sodium=1093.

#### Macro Slider Logic

When one slider moves, the other two adjust proportionally to maintain 100% total. Display real-time gram values: protein/carb grams = (calories × %) / 4, fat grams = (calories × %) / 9.

#### Dashboard Color Coding

Green: within 10% of goal. Yellow: 10–25% deviation. Red: >25% deviation.

## Environment

Requires `VITE_USDA_API_KEY` in `.env.local`. Get a key at https://fdc.nal.usda.gov/api-key-signup.html
