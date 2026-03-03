# AI Urban Change Detector — Design Document

## Overview

A map-based application where users search for a city, select a district, and compare building footprints and land use data across two time periods. AI generates a narrative explaining what changed and why. Built with Leaflet.js, Overpass API (OpenStreetMap), and OpenRouter AI.

## Tech Stack

- **Map rendering:** Leaflet.js with OpenStreetMap tiles
- **Geocoding:** Nominatim API (free, no key required)
- **Area selection:** Leaflet.draw (rectangle tool)
- **Historical data:** Overpass API with time-filtered queries
- **AI narration:** OpenRouter (consistent with existing portfolio apps)
- **State:** Pinia (single store, `currentStage` pattern)
- **PDF export:** html2canvas + jsPDF (same as Nutrition app)
- **Framework:** Vue 3 Composition API + TypeScript

## User Flow — 3 Stages

### Stage 1: Select Location

- Full-screen Leaflet map with search bar
- Nominatim geocoding converts city name to coordinates, map flies to location
- User draws a rectangle on the map to define the analysis area (Leaflet.draw)
- Sidebar shows selected area coordinates and estimated size
- "Analyze This Area" button advances to Stage 2
- Quick-start buttons for popular cities with strong OSM coverage (Dubai, Shenzhen, Singapore, Austin)

### Stage 2: Configure Analysis

- Pick two time periods to compare (e.g., "2015" vs "2024")
- Available year range depends on OSM data coverage for the area
- Optional focus filter: buildings, roads, land use, or all
- "Run Analysis" button triggers data fetch and AI narration

### Stage 3: Results Dashboard

- Split view: map (left) with change overlays + analysis panel (right)
- Color-coded GeoJSON polygons:
  - Green: new buildings/structures
  - Red: removed/demolished
  - Yellow: modified (changed footprint or land use tag)
- Clickable polygons with tooltips (building type, year, land use)
- Toggle buttons to show/hide each change type
- Stats cards: new/removed/modified counts, net area change (km²), land use shift summary
- AI narrative panel with sections: Overview, Key Changes, Possible Drivers, Urban Development Context
- PDF export of full dashboard

## Data Architecture

### Data Flow

```
Nominatim → [lat/lng] → Overpass (Year A) + Overpass (Year B)
  → Client-side diff engine → Change summary
    → OpenRouter AI → Narrative
      → Dashboard render (map overlays + stats + text)
```

### Overpass Queries

- Query building footprints and land use polygons within selected bounding box
- Use `[date:"YYYY-MM-DD"]` time filter for historical snapshots
- Extract: building count, footprint geometry, land use tags (residential, commercial, industrial, retail)

### Client-Side Diff Engine

- Match buildings by proximity/overlap between Year A and Year B
- Classify as: new (B only), removed (A only), modified (both but changed)
- Compute aggregate stats for dashboard cards

### AI Prompt

Send structured change summary to OpenRouter:
- Location name and coordinates
- Year A stats vs Year B stats
- List of notable changes (new clusters, demolished zones, land use shifts)

AI returns structured narrative with urban context.

## State Management

Single Pinia store managing:
- Selected bounding box coordinates
- Year pair (Year A, Year B)
- Raw Overpass responses
- Computed diffs (new/removed/modified arrays)
- AI narrative text
- Current stage (1, 2, or 3)
- Loading/error states

No sub-routes — stage transitions via `currentStage` with `v-if`.

## Error Handling

- **Area too large:** Cap at ~5 km², warn user to zoom in
- **Overpass timeout:** 30-second timeout, loading state with progress message
- **Sparse historical data:** Clear message suggesting major cities or more recent year range
- **Zero changes detected:** Message suggesting wider time range or different area
- **Low building count:** Warning about limited mapping coverage (< 5 buildings)
- **Nominatim no results:** Inline validation with suggestion to try different city name
- **Nominatim rate limit:** Debounce search input (1 req/sec)
- **OpenRouter failures:** Exponential backoff retry (max 3 attempts)
- **Duplicate submissions:** Disable "Analyze" button during processing

## Routing

| Route | Purpose |
|-------|---------|
| `/urban-change` | AI Urban Change Detector (standalone app) |

Registered in `src/config/projects.ts` with tag set: `['Vue 3', 'Leaflet.js', 'Overpass API', 'OpenRouter AI']`.

## Environment

Requires `VITE_OPENROUTER_API_KEY` in `.env.local` (same as existing apps).
No additional API keys needed — Nominatim and Overpass are free and keyless.
