# Romefy Portfolio — Application Specification

## Overview

A portfolio platform hosted at **portfolio.romefy.com** that showcases interactive web application projects. The landing page is a project gallery where visitors browse and select projects. Each project runs as a standalone app with its own full-screen layout, connected back to the portfolio via a subtle "back to portfolio" link.

The first (and currently only) showcased project is the **Meal Nutrition Planner**.

---

## Tech Stack

| Layer       | Technology             |
|-------------|------------------------|
| Framework   | Vue.js 3 (Composition API) |
| Language    | TypeScript             |
| Routing     | Vue Router 4           |
| Styling     | Tailwind CSS           |
| Build Tool  | Vite                   |
| Charts      | Chart.js + vue-chartjs |
| PDF Export  | html2canvas + jsPDF    |
| HTTP Client | Axios                  |
| API         | USDA FoodData Central  |

---

## Route Structure

| Route          | View               | Description                              |
|----------------|---------------------|------------------------------------------|
| `/`            | Portfolio Gallery    | Landing page — grid of project cards     |
| `/nutrition`   | Nutrition App        | Meal Nutrition Planner (standalone app)  |
| `/:catchAll`   | 404 Not Found        | Fallback for unknown routes              |

Future projects will each get their own top-level route (e.g., `/weather`, `/finance`).

---

## Portfolio Gallery (`/`)

### Layout

The landing page is a project gallery — a visually striking grid of project cards that invites exploration.

### Content

- **Hero area**: "Romefy Portfolio" branding with a short tagline
- **Project grid**: Responsive card grid (1-col mobile → 2-col tablet → 3-col desktop)
- Each project card contains:
  - Project thumbnail/preview image or icon
  - Project title
  - Short description (1–2 sentences)
  - Tech tags (e.g., "Vue 3", "Chart.js", "USDA API")
  - Link to the project route

### Behavior

- Clicking a project card navigates to its route (e.g., `/nutrition`)
- Cards have hover effects and smooth transitions
- No authentication required — all projects are publicly viewable

---

## Project Shell

Each project runs as a **standalone app** with its own full-screen layout. Projects do NOT share a common portfolio header or navigation bar.

The only connection back to the portfolio is a small, unobtrusive "Back to Portfolio" link/button in each project's own header area. This keeps projects feeling like independent applications while maintaining navigability.

### Project Registration

Projects are registered in a central config (e.g., `src/config/projects.ts`) that defines:
- `id` — unique slug (used as route path)
- `title` — display name
- `description` — short summary
- `tags` — technology tags
- `icon` — Lucide icon name or component
- `route` — Vue Router route path

This config drives both the gallery cards and the route registration.

---

## Project: Meal Nutrition Planner (`/nutrition`)

### Overview

A 3-stage application that allows users to upload a meal plan (JSON), configure nutritional goals, and view a per-meal nutritional analysis dashboard with PDF export.

Within the `/nutrition` route, the three stages (Upload, Goals, Dashboard) are rendered conditionally based on `currentStage` in the Pinia store — **no sub-routes**. The browser URL stays at `/nutrition` throughout all three stages. Stage transitions use slide animations.

### JSON Schema (Fixed)

```json
{
  "planName": "string",
  "meals": [
    {
      "name": "string",
      "time": "HH:mm",
      "items": [
        {
          "food": "string",
          "quantity": "number",
          "unit": "g | ml | oz | cup | tbsp | tsp | piece"
        }
      ]
    }
  ]
}
```

#### Sample Input

```json
{
  "planName": "Week 1 - Cutting Phase",
  "meals": [
    {
      "name": "Breakfast",
      "time": "07:00",
      "items": [
        { "food": "Egg, whole, raw", "quantity": 3, "unit": "piece" },
        { "food": "Oats", "quantity": 80, "unit": "g" },
        { "food": "Banana", "quantity": 1, "unit": "piece" }
      ]
    },
    {
      "name": "Lunch",
      "time": "12:00",
      "items": [
        { "food": "Chicken breast, raw", "quantity": 200, "unit": "g" },
        { "food": "Brown rice", "quantity": 150, "unit": "g" },
        { "food": "Broccoli", "quantity": 100, "unit": "g" }
      ]
    },
    {
      "name": "Snack",
      "time": "15:30",
      "items": [
        { "food": "Greek yogurt", "quantity": 150, "unit": "g" },
        { "food": "Almonds", "quantity": 30, "unit": "g" }
      ]
    },
    {
      "name": "Dinner",
      "time": "19:00",
      "items": [
        { "food": "Salmon fillet", "quantity": 180, "unit": "g" },
        { "food": "Sweet potato", "quantity": 200, "unit": "g" },
        { "food": "Spinach", "quantity": 80, "unit": "g" }
      ]
    }
  ]
}
```

#### Validation Rules

- `planName` — required, non-empty string
- `meals` — required, minimum 1 meal
- `meals[].name` — required, non-empty string
- `meals[].time` — required, valid HH:mm format
- `meals[].items` — required, minimum 1 item
- `meals[].items[].food` — required, non-empty string
- `meals[].items[].quantity` — required, positive number
- `meals[].items[].unit` — required, must be one of: `g`, `ml`, `oz`, `cup`, `tbsp`, `tsp`, `piece`

#### Validation UX

- On upload, validate schema structure immediately
- Display inline errors with line-level specificity (e.g., "Meal 2, Item 3: missing 'unit' field")
- Block progression to Stage 2 until all validation errors are resolved
- Provide a "Download Sample JSON" link so users can see the expected format

---

### Stage 1 — Upload

#### Functionality

1. Drag-and-drop zone + file browser fallback for `.json` files
2. On file drop/select:
   - Parse JSON
   - Validate against fixed schema (see Validation Rules above)
   - Display parsed meal plan as a preview table
3. Preview table columns: **Meal Name | Time | Food Item | Quantity | Unit**
4. "Download Sample JSON" button available at all times

#### State Output

- Parsed and validated `MealPlan` object passed to Stage 2

---

### Stage 2 — Configure Goals

#### Parameters

| Parameter              | Input Type     | Default  | Constraints          |
|------------------------|----------------|----------|----------------------|
| Daily Calorie Target   | Number input   | 2000     | 500–10,000 kcal      |
| Protein %              | Slider         | 30%      | 5–60%                |
| Carbohydrate %         | Slider         | 40%      | 5–60%                |
| Fat %                  | Slider         | 30%      | 5–60%                |

#### Macro Slider Behavior

- Protein + Carb + Fat must always equal 100%
- When one slider moves, the other two adjust proportionally
- Display both percentage and computed gram value in real-time:
  - `Protein grams = (calorie target × protein%) / 4`
  - `Carb grams = (calorie target × carb%) / 4`
  - `Fat grams = (calorie target × fat%) / 9`

#### Threshold Alerts Configuration

| Threshold               | Type     | Default |
|--------------------------|----------|---------|
| Sodium (mg/day)          | Max cap  | 2300    |
| Sugar (g/day)            | Max cap  | 50      |
| Fiber (g/day)            | Min floor| 25      |

#### State Output

- `NutritionGoals` object containing all configured values passed to Stage 3

---

### Stage 3 — Dashboard

#### USDA API Integration

- **Endpoint:** `https://api.nal.usda.gov/fdc/v1/foods/search`
- **Auth:** Embedded API key (via environment variable `VITE_USDA_API_KEY`)
- **Matching Strategy:**
  - For each food item in the meal plan, query USDA with the `food` string
  - Auto-select the first result (`foods[0]`) from the response
  - Extract per-100g nutrient values and scale to the user's specified quantity
  - Cache results in memory to avoid redundant API calls for duplicate food items

- **Nutrients to Extract (by USDA nutrient ID):**

| Nutrient        | USDA Nutrient Number | Unit  |
|-----------------|----------------------|-------|
| Calories        | 1008                 | kcal  |
| Protein         | 1003                 | g     |
| Total Fat       | 1004                 | g     |
| Carbohydrates   | 1005                 | g     |
| Fiber           | 1079                 | g     |
| Sugar           | 2000                 | g     |
| Sodium          | 1093                 | mg    |

- **Unit Conversion:**
  - API returns values per 100g
  - For `g` → direct scaling: `(quantity / 100) × nutrient_value`
  - For non-gram units, apply conversion before scaling:

| Unit   | Conversion to grams |
|--------|---------------------|
| g      | 1                   |
| ml     | 1 (assume water density as approximation) |
| oz     | 28.35               |
| cup    | 240                 |
| tbsp   | 15                  |
| tsp    | 5                   |
| piece  | Use USDA serving size weight if available, fallback to 100g |

#### Loading State

- Show a progress indicator while fetching from USDA
- Display: "Fetching nutritional data... (X of Y items)"
- Handle API failures gracefully per-item (show warning icon next to unresolved items, don't block entire dashboard)

---

#### Dashboard Layout

##### Section 1 — Daily Summary KPI Cards

A horizontal row of cards showing totals vs. goals:

| KPI Card         | Display                          | Visual Indicator         |
|------------------|----------------------------------|--------------------------|
| Calories         | `1,847 / 2,000 kcal`            | Circular progress ring   |
| Protein          | `142g / 150g`                    | Circular progress ring   |
| Carbs            | `198g / 200g`                    | Circular progress ring   |
| Fat              | `61g / 67g`                      | Circular progress ring   |

- Color coding: Green (within 10% of goal), Yellow (10-25% deviation), Red (>25% deviation)

##### Section 2 — Macro Distribution (Doughnut Chart)

- **Chart type:** Doughnut
- **Data:** Actual macro split (protein kcal / carb kcal / fat kcal) as percentages
- **Center label:** Total calories
- **Outer ring (optional):** Goal macro split for visual comparison

##### Section 3 — Per-Meal Calorie Breakdown (Stacked Bar Chart)

- **Chart type:** Horizontal stacked bar
- **X-axis:** Calories (kcal)
- **Y-axis:** Meal names (Breakfast, Lunch, Snack, Dinner)
- **Stacks:** Protein kcal (blue), Carb kcal (green), Fat kcal (orange)

##### Section 4 — Per-Meal Detail Tables

One expandable/collapsible card per meal:

| Column      | Description                        |
|-------------|------------------------------------|
| Food Item   | Name as entered + matched USDA name|
| Quantity    | As entered (e.g., "200g")         |
| Calories    | Computed kcal                      |
| Protein     | g                                  |
| Carbs       | g                                  |
| Fat         | g                                  |
| Fiber       | g                                  |
| Sugar       | g                                  |
| Sodium      | mg                                 |

- Row-level warning icon if a food item failed USDA lookup
- Subtotal row per meal

##### Section 5 — Threshold Alerts Panel

- List of threshold violations based on Stage 2 configuration
- Format: `⚠ Sodium: 2,450mg exceeds 2,300mg daily limit`
- Format: `⚠ Fiber: 18g below 25g daily minimum`
- If no violations: `✓ All thresholds within range`

##### Section 6 — Meal Timeline (Horizontal Bar/Gantt)

- **Chart type:** Horizontal bar or timeline
- **X-axis:** Time of day (00:00–24:00)
- **Y-axis:** Meal names
- **Bar size:** Proportional to calorie content of the meal
- **Purpose:** Visual representation of calorie distribution across the day

---

#### PDF Export

- **Trigger:** "Export to PDF" button in the dashboard header
- **Library:** html2canvas to capture dashboard sections → jsPDF to compose
- **PDF Structure:**
  1. Header: Plan name, export date
  2. Daily Summary KPIs
  3. Macro Distribution Chart
  4. Per-Meal Breakdown Chart
  5. Per-Meal Detail Tables
  6. Threshold Alerts
  7. Meal Timeline
- **Page size:** A4, landscape orientation
- **Quality:** Capture at 2x resolution for crisp charts

---

## Error Handling

| Scenario                          | Behavior                                                    |
|-----------------------------------|-------------------------------------------------------------|
| Invalid JSON syntax               | Toast error + highlight parse failure location              |
| Schema validation failure         | Inline errors per field, block Stage 2 progression          |
| USDA API key missing/invalid      | Full-screen error with setup instructions                   |
| USDA food item not found          | Warning icon on item, exclude from calculations, show count |
| USDA API rate limit / timeout     | Retry with exponential backoff (max 3 retries), then warn   |
| Macro sliders don't sum to 100%   | Auto-adjust remaining sliders proportionally                |
| All food items fail lookup        | Block dashboard render, show actionable error               |
| Unknown route                     | 404 page with link back to portfolio gallery                |

---

## Adding Future Projects

To add a new project:
1. Create a new route entry in the router config
2. Add the project to the central project registry (`src/config/projects.ts`)
3. Build the project's view/components under its own directory (e.g., `src/projects/weather/`)
4. The gallery page auto-renders a card from the registry — no gallery code changes needed
