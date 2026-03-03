# AI Urban Change Detector Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a map-based app where users search a city, select a district, and compare building footprints/land use across two time periods with AI-narrated change analysis.

**Architecture:** 3-stage Vue app (Select Location → Configure Analysis → Results Dashboard) using Leaflet.js for maps, Overpass API for historical OSM data, client-side diff engine for change detection, and OpenRouter AI for narrative generation. Follows the existing portfolio pattern: single Pinia store with `currentStage`, no sub-routes, all styles in `main.css`.

**Tech Stack:** Vue 3 + TypeScript, Leaflet.js, Leaflet.draw, Nominatim API, Overpass API, OpenRouter AI, Pinia, html2canvas + jsPDF

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install leaflet and its types**

Run:
```bash
npm install leaflet
npm install -D @types/leaflet
```

**Step 2: Install leaflet-draw and its types**

Run:
```bash
npm install leaflet-draw
npm install -D @types/leaflet-draw
```

**Step 3: Verify installation**

Run: `npm run type-check`
Expected: No new errors

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(urban-change): install leaflet and leaflet-draw dependencies"
```

---

### Task 2: Register Project in Config & Router

**Files:**
- Modify: `src/config/projects.ts`
- Modify: `src/router/index.ts`
- Create: `src/views/UrbanChangeApp.vue` (minimal placeholder)

**Step 1: Add project to registry**

In `src/config/projects.ts`, add to the `projects` array:

```typescript
{
  id: 'urban-change',
  title: 'AI Urban Change Detector',
  description:
    'Search any city, select a district, and compare building footprints across time periods with AI-narrated urban change analysis.',
  tags: ['Vue 3', 'Leaflet.js', 'Overpass API', 'OpenRouter AI'],
  icon: 'MapPin',
  route: '/urban-change',
},
```

**Step 2: Create placeholder view**

Create `src/views/UrbanChangeApp.vue`:

```vue
<template>
  <div class="uc-app">
    <p>Urban Change Detector — coming soon</p>
  </div>
</template>
```

**Step 3: Add route**

In `src/router/index.ts`, add before the catch-all route:

```typescript
{
  path: '/urban-change',
  name: 'urban-change',
  component: () => import('@/views/UrbanChangeApp.vue'),
},
```

**Step 4: Verify**

Run: `npm run dev`
Visit: `http://localhost:5173/` — should see the new project card in the gallery.
Visit: `http://localhost:5173/urban-change` — should see placeholder text.

**Step 5: Commit**

```bash
git add src/config/projects.ts src/router/index.ts src/views/UrbanChangeApp.vue
git commit -m "feat(urban-change): register project in config and router"
```

---

### Task 3: Define TypeScript Types

**Files:**
- Create: `src/types/urban-change.ts`

**Step 1: Create type definitions**

Create `src/types/urban-change.ts` with all types needed for the app:

```typescript
export type UrbanChangeStage = 1 | 2 | 3

export type AnalysisState = 'idle' | 'fetching-old' | 'fetching-new' | 'diffing' | 'ai-narrating' | 'done' | 'error'

export type FocusFilter = 'buildings' | 'landuse' | 'all'

export interface BoundingBox {
  south: number
  west: number
  north: number
  east: number
}

export interface LocationInfo {
  name: string
  displayName: string
  lat: number
  lng: number
}

export interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  boundingbox: [string, string, string, string]
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  tags?: Record<string, string>
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number }
  geometry?: Array<{ lat: number; lon: number }>
  lat?: number
  lon?: number
}

export interface OverpassResponse {
  elements: OverpassElement[]
}

export interface BuildingFootprint {
  id: number
  type: 'way' | 'relation'
  geometry: Array<{ lat: number; lon: number }>
  bounds: { minlat: number; minlon: number; maxlat: number; maxlon: number }
  tags: Record<string, string>
  centroidLat: number
  centroidLng: number
  area: number // approximate area in m²
}

export interface LandUseArea {
  id: number
  type: 'way' | 'relation'
  geometry: Array<{ lat: number; lon: number }>
  tags: Record<string, string>
  landUseType: string
  area: number
}

export type ChangeType = 'added' | 'removed' | 'modified'

export interface BuildingChange {
  changeType: ChangeType
  building: BuildingFootprint
  previousBuilding?: BuildingFootprint // for 'modified' type
  details: string
}

export interface LandUseChange {
  changeType: ChangeType
  area: LandUseArea
  previousArea?: LandUseArea
  fromType?: string
  toType?: string
}

export interface ChangeSummary {
  addedBuildings: BuildingChange[]
  removedBuildings: BuildingChange[]
  modifiedBuildings: BuildingChange[]
  landUseChanges: LandUseChange[]
  stats: ChangeStats
}

export interface ChangeStats {
  totalBuildingsYearA: number
  totalBuildingsYearB: number
  addedCount: number
  removedCount: number
  modifiedCount: number
  netAreaChangeM2: number
  landUseShifts: Array<{ from: string; to: string; count: number }>
}

export interface AiNarrative {
  overview: string
  keyChanges: string
  possibleDrivers: string
  urbanContext: string
  fullText: string
}

export interface QuickStartCity {
  name: string
  lat: number
  lng: number
  zoom: number
  description: string
}
```

**Step 2: Verify**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/urban-change.ts
git commit -m "feat(urban-change): define TypeScript types"
```

---

### Task 4: Create Pinia Store

**Files:**
- Create: `src/stores/urban-change.ts`

**Step 1: Create the store**

Create `src/stores/urban-change.ts` following the composition API pattern with cascading resets (same pattern as `ecg-analyzer.ts` and `task-breakdown.ts`):

```typescript
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  UrbanChangeStage,
  AnalysisState,
  FocusFilter,
  BoundingBox,
  LocationInfo,
  ChangeSummary,
  AiNarrative,
} from '@/types/urban-change'

export const useUrbanChangeStore = defineStore('urban-change', () => {
  // Stage
  const currentStage = ref<UrbanChangeStage>(1)

  // Stage 1 — Location
  const selectedLocation = ref<LocationInfo | null>(null)
  const selectedBounds = ref<BoundingBox | null>(null)
  const selectedAreaKm2 = ref(0)

  // Stage 2 — Configuration
  const yearA = ref(2015)
  const yearB = ref(2024)
  const focusFilter = ref<FocusFilter>('all')

  // Stage 3 — Results
  const analysisState = ref<AnalysisState>('idle')
  const analysisError = ref<string | null>(null)
  const changeSummary = ref<ChangeSummary | null>(null)
  const aiNarrative = ref<AiNarrative | null>(null)
  const aiState = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
  const aiError = ref<string | null>(null)

  // Stage navigation
  function goToStage(stage: UrbanChangeStage) {
    currentStage.value = stage
  }

  // Stage 1 setters
  function setLocation(location: LocationInfo | null) {
    selectedLocation.value = location
    // Cascade reset downstream
    selectedBounds.value = null
    selectedAreaKm2.value = 0
    clearResults()
  }

  function setBounds(bounds: BoundingBox | null, areaKm2: number) {
    selectedBounds.value = bounds
    selectedAreaKm2.value = areaKm2
    clearResults()
  }

  // Stage 2 setters
  function setYears(a: number, b: number) {
    yearA.value = a
    yearB.value = b
    clearResults()
  }

  function setFocusFilter(filter: FocusFilter) {
    focusFilter.value = filter
    clearResults()
  }

  // Stage 3 setters
  function setAnalysisState(state: AnalysisState) {
    analysisState.value = state
  }

  function setAnalysisError(error: string | null) {
    analysisError.value = error
  }

  function setChangeSummary(summary: ChangeSummary | null) {
    changeSummary.value = summary
  }

  function setAiNarrative(narrative: AiNarrative | null) {
    aiNarrative.value = narrative
  }

  function setAiState(state: 'idle' | 'loading' | 'done' | 'error') {
    aiState.value = state
  }

  function setAiError(error: string | null) {
    aiError.value = error
  }

  function clearResults() {
    analysisState.value = 'idle'
    analysisError.value = null
    changeSummary.value = null
    aiNarrative.value = null
    aiState.value = 'idle'
    aiError.value = null
  }

  function reset() {
    currentStage.value = 1
    selectedLocation.value = null
    selectedBounds.value = null
    selectedAreaKm2.value = 0
    yearA.value = 2015
    yearB.value = 2024
    focusFilter.value = 'all'
    clearResults()
  }

  return {
    // State
    currentStage,
    selectedLocation,
    selectedBounds,
    selectedAreaKm2,
    yearA,
    yearB,
    focusFilter,
    analysisState,
    analysisError,
    changeSummary,
    aiNarrative,
    aiState,
    aiError,
    // Actions
    goToStage,
    setLocation,
    setBounds,
    setYears,
    setFocusFilter,
    setAnalysisState,
    setAnalysisError,
    setChangeSummary,
    setAiNarrative,
    setAiState,
    setAiError,
    clearResults,
    reset,
  }
})
```

**Step 2: Verify**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/stores/urban-change.ts
git commit -m "feat(urban-change): create Pinia store with cascading resets"
```

---

### Task 5: Create Nominatim Geocoding Service

**Files:**
- Create: `src/services/nominatim-api.ts`

**Step 1: Create the service**

Create `src/services/nominatim-api.ts`:

```typescript
import type { NominatimResult } from '@/types/urban-change'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

let lastRequestTime = 0

async function throttle(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed))
  }
  lastRequestTime = Date.now()
}

export async function searchLocation(query: string): Promise<NominatimResult[]> {
  if (!query.trim()) return []

  await throttle()

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    addressdetails: '0',
  })

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      'User-Agent': 'RomefyUrbanChangeDetector/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
```

**Step 2: Verify**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/nominatim-api.ts
git commit -m "feat(urban-change): add Nominatim geocoding service"
```

---

### Task 6: Create Overpass API Service

**Files:**
- Create: `src/services/overpass-api.ts`

**Step 1: Create the service**

Create `src/services/overpass-api.ts`. This service queries the Overpass API for building footprints and land use areas within a bounding box, with optional time-filtering for historical data:

```typescript
import type {
  BoundingBox,
  OverpassResponse,
  BuildingFootprint,
  LandUseArea,
  FocusFilter,
} from '@/types/urban-change'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const TIMEOUT_SECONDS = 30

function buildQuery(bounds: BoundingBox, focus: FocusFilter, date?: string): string {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
  const dateDirective = date ? `[date:"${date}"]` : ''

  const parts: string[] = []

  if (focus === 'buildings' || focus === 'all') {
    parts.push(`way["building"](${bbox});`)
    parts.push(`relation["building"](${bbox});`)
  }

  if (focus === 'landuse' || focus === 'all') {
    parts.push(`way["landuse"](${bbox});`)
    parts.push(`relation["landuse"](${bbox});`)
  }

  return `[out:json][timeout:${TIMEOUT_SECONDS}]${dateDirective};(${parts.join('')});out body geom;`
}

async function queryOverpass(query: string): Promise<OverpassResponse> {
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Overpass API rate limit exceeded. Please wait a moment and try again.')
    }
    if (response.status === 504) {
      throw new Error('Query timed out. Try selecting a smaller area or a major city.')
    }
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

function computeCentroid(geometry: Array<{ lat: number; lon: number }>): { lat: number; lng: number } {
  if (geometry.length === 0) return { lat: 0, lng: 0 }
  const sumLat = geometry.reduce((s, p) => s + p.lat, 0)
  const sumLng = geometry.reduce((s, p) => s + p.lon, 0)
  return { lat: sumLat / geometry.length, lng: sumLng / geometry.length }
}

function computePolygonArea(geometry: Array<{ lat: number; lon: number }>): number {
  // Shoelace formula approximation in m² using equirectangular projection
  if (geometry.length < 3) return 0
  const toRad = Math.PI / 180
  const R = 6371000 // Earth radius in meters
  let area = 0
  for (let i = 0; i < geometry.length; i++) {
    const j = (i + 1) % geometry.length
    const xi = geometry[i].lon * toRad * R * Math.cos(geometry[i].lat * toRad)
    const yi = geometry[i].lat * toRad * R
    const xj = geometry[j].lon * toRad * R * Math.cos(geometry[j].lat * toRad)
    const yj = geometry[j].lat * toRad * R
    area += xi * yj - xj * yi
  }
  return Math.abs(area) / 2
}

function parseBuildings(response: OverpassResponse): BuildingFootprint[] {
  return response.elements
    .filter((el) => (el.type === 'way' || el.type === 'relation') && el.tags?.building && el.geometry)
    .map((el) => {
      const geom = el.geometry!
      const centroid = computeCentroid(geom)
      return {
        id: el.id,
        type: el.type as 'way' | 'relation',
        geometry: geom,
        bounds: el.bounds ?? { minlat: 0, minlon: 0, maxlat: 0, maxlon: 0 },
        tags: el.tags ?? {},
        centroidLat: centroid.lat,
        centroidLng: centroid.lng,
        area: computePolygonArea(geom),
      }
    })
}

function parseLandUse(response: OverpassResponse): LandUseArea[] {
  return response.elements
    .filter((el) => (el.type === 'way' || el.type === 'relation') && el.tags?.landuse && el.geometry)
    .map((el) => ({
      id: el.id,
      type: el.type as 'way' | 'relation',
      geometry: el.geometry!,
      tags: el.tags ?? {},
      landUseType: el.tags!.landuse,
      area: computePolygonArea(el.geometry!),
    }))
}

export async function fetchOverpassData(
  bounds: BoundingBox,
  year: number,
  focus: FocusFilter,
): Promise<{ buildings: BuildingFootprint[]; landUse: LandUseArea[] }> {
  const date = `${year}-01-01T00:00:00Z`
  const query = buildQuery(bounds, focus, date)
  const response = await queryOverpass(query)

  return {
    buildings: parseBuildings(response),
    landUse: parseLandUse(response),
  }
}

export async function fetchCurrentData(
  bounds: BoundingBox,
  focus: FocusFilter,
): Promise<{ buildings: BuildingFootprint[]; landUse: LandUseArea[] }> {
  const query = buildQuery(bounds, focus)
  const response = await queryOverpass(query)

  return {
    buildings: parseBuildings(response),
    landUse: parseLandUse(response),
  }
}
```

**Step 2: Verify**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/overpass-api.ts
git commit -m "feat(urban-change): add Overpass API service with time-filtered queries"
```

---

### Task 7: Create Diff Engine Service

**Files:**
- Create: `src/services/urban-change-diff.ts`

**Step 1: Create the diff engine**

Create `src/services/urban-change-diff.ts`. This compares two snapshots of buildings/land use and classifies changes:

```typescript
import type {
  BuildingFootprint,
  LandUseArea,
  BuildingChange,
  LandUseChange,
  ChangeSummary,
  ChangeStats,
} from '@/types/urban-change'

const PROXIMITY_THRESHOLD_M = 15 // meters — buildings within this distance are considered "same"

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000
  const toRad = Math.PI / 180
  const dLat = (lat2 - lat1) * toRad
  const dLon = (lon2 - lon1) * toRad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function findClosestMatch(
  building: BuildingFootprint,
  candidates: BuildingFootprint[],
  matched: Set<number>,
): BuildingFootprint | null {
  let closest: BuildingFootprint | null = null
  let minDist = Infinity

  for (const candidate of candidates) {
    if (matched.has(candidate.id)) continue
    const dist = haversineDistance(
      building.centroidLat,
      building.centroidLng,
      candidate.centroidLat,
      candidate.centroidLng,
    )
    if (dist < PROXIMITY_THRESHOLD_M && dist < minDist) {
      minDist = dist
      closest = candidate
    }
  }

  return closest
}

function hasSignificantChange(a: BuildingFootprint, b: BuildingFootprint): boolean {
  // Check if area changed by more than 20%
  const areaRatio = Math.abs(a.area - b.area) / Math.max(a.area, 1)
  if (areaRatio > 0.2) return true

  // Check if building type/tag changed
  if (a.tags.building !== b.tags.building) return true

  return false
}

function diffBuildings(
  buildingsA: BuildingFootprint[],
  buildingsB: BuildingFootprint[],
): { added: BuildingChange[]; removed: BuildingChange[]; modified: BuildingChange[] } {
  const matchedA = new Set<number>()
  const matchedB = new Set<number>()
  const modified: BuildingChange[] = []

  // Match buildings between snapshots by proximity
  for (const bA of buildingsA) {
    const match = findClosestMatch(bA, buildingsB, matchedB)
    if (match) {
      matchedA.add(bA.id)
      matchedB.add(match.id)
      if (hasSignificantChange(bA, match)) {
        modified.push({
          changeType: 'modified',
          building: match,
          previousBuilding: bA,
          details: describeModification(bA, match),
        })
      }
    }
  }

  // Unmatched in A = removed
  const removed: BuildingChange[] = buildingsA
    .filter((b) => !matchedA.has(b.id))
    .map((b) => ({
      changeType: 'removed' as const,
      building: b,
      details: `Removed ${b.tags.building || 'building'} (${Math.round(b.area)} m²)`,
    }))

  // Unmatched in B = added
  const added: BuildingChange[] = buildingsB
    .filter((b) => !matchedB.has(b.id))
    .map((b) => ({
      changeType: 'added' as const,
      building: b,
      details: `New ${b.tags.building || 'building'} (${Math.round(b.area)} m²)`,
    }))

  return { added, removed, modified }
}

function describeModification(old: BuildingFootprint, current: BuildingFootprint): string {
  const parts: string[] = []
  const areaDiff = current.area - old.area
  if (Math.abs(areaDiff) > old.area * 0.2) {
    parts.push(`area ${areaDiff > 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(areaDiff))} m²`)
  }
  if (old.tags.building !== current.tags.building) {
    parts.push(`type changed from "${old.tags.building}" to "${current.tags.building}"`)
  }
  return parts.length > 0 ? parts.join(', ') : 'minor modifications'
}

function diffLandUse(
  landUseA: LandUseArea[],
  landUseB: LandUseArea[],
): LandUseChange[] {
  const changes: LandUseChange[] = []
  const matchedB = new Set<number>()

  for (const areaA of landUseA) {
    const match = landUseB.find((b) => b.id === areaA.id && !matchedB.has(b.id))
    if (match) {
      matchedB.add(match.id)
      if (match.landUseType !== areaA.landUseType) {
        changes.push({
          changeType: 'modified',
          area: match,
          previousArea: areaA,
          fromType: areaA.landUseType,
          toType: match.landUseType,
        })
      }
    } else {
      changes.push({
        changeType: 'removed',
        area: areaA,
        fromType: areaA.landUseType,
      })
    }
  }

  for (const areaB of landUseB) {
    if (!matchedB.has(areaB.id)) {
      changes.push({
        changeType: 'added',
        area: areaB,
        toType: areaB.landUseType,
      })
    }
  }

  return changes
}

function computeStats(
  buildingsA: BuildingFootprint[],
  buildingsB: BuildingFootprint[],
  added: BuildingChange[],
  removed: BuildingChange[],
  modified: BuildingChange[],
  landUseChanges: LandUseChange[],
): ChangeStats {
  const totalAreaA = buildingsA.reduce((sum, b) => sum + b.area, 0)
  const totalAreaB = buildingsB.reduce((sum, b) => sum + b.area, 0)

  // Compute land use shifts
  const shiftMap = new Map<string, number>()
  for (const change of landUseChanges) {
    if (change.changeType === 'modified' && change.fromType && change.toType) {
      const key = `${change.fromType}→${change.toType}`
      shiftMap.set(key, (shiftMap.get(key) ?? 0) + 1)
    }
  }

  return {
    totalBuildingsYearA: buildingsA.length,
    totalBuildingsYearB: buildingsB.length,
    addedCount: added.length,
    removedCount: removed.length,
    modifiedCount: modified.length,
    netAreaChangeM2: totalAreaB - totalAreaA,
    landUseShifts: Array.from(shiftMap.entries()).map(([key, count]) => {
      const [from, to] = key.split('→')
      return { from, to, count }
    }),
  }
}

export function computeChangeSummary(
  buildingsA: BuildingFootprint[],
  buildingsB: BuildingFootprint[],
  landUseA: LandUseArea[],
  landUseB: LandUseArea[],
): ChangeSummary {
  const { added, removed, modified } = diffBuildings(buildingsA, buildingsB)
  const landUseChanges = diffLandUse(landUseA, landUseB)
  const stats = computeStats(buildingsA, buildingsB, added, removed, modified, landUseChanges)

  return {
    addedBuildings: added,
    removedBuildings: removed,
    modifiedBuildings: modified,
    landUseChanges,
    stats,
  }
}
```

**Step 2: Verify**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/urban-change-diff.ts
git commit -m "feat(urban-change): add client-side diff engine for building/land use comparison"
```

---

### Task 8: Create OpenRouter AI Narration Service

**Files:**
- Create: `src/services/urban-change-ai.ts`

**Step 1: Create the AI narration service**

Create `src/services/urban-change-ai.ts`. Follow the same pattern as `gemini-api.ts` (retry with exponential backoff, humanized errors):

```typescript
import type { ChangeStats, AiNarrative, LocationInfo } from '@/types/urban-change'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-2.0-flash-001'
const RETRY_DELAYS = [1000, 2000, 4000]

function isRetryable(error: unknown): boolean {
  const msg = String(error)
  return msg.includes('429') || msg.includes('500') || msg.includes('502') || msg.includes('503')
}

function humanizeError(error: unknown): string {
  const msg = String(error)
  if (msg.includes('401') || msg.includes('403')) {
    return 'OpenRouter API key is missing or invalid. Add your key as VITE_OPENROUTER_API_KEY in .env.local and restart the dev server.'
  }
  if (msg.includes('402')) {
    return 'OpenRouter account has insufficient credits. Please add credits at openrouter.ai.'
  }
  if (msg.includes('429')) {
    return 'Rate limit exceeded. Please wait a moment and try again.'
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Network error — check your internet connection and try again.'
  }
  return `AI analysis failed: ${msg}`
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < RETRY_DELAYS.length && isRetryable(error)) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
      } else {
        throw new Error(humanizeError(error))
      }
    }
  }
  throw new Error(humanizeError(lastError))
}

function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
}

function buildSystemPrompt(): string {
  return `You are an urban development analyst. Given data about building and land use changes in a geographic area between two time periods, generate an insightful analysis.

Respond in JSON with exactly these keys:
- "overview": A 2-3 sentence summary of the overall urban transformation.
- "keyChanges": A paragraph describing the most significant specific changes (new construction clusters, demolitions, land use shifts).
- "possibleDrivers": A paragraph speculating on likely causes based on the location, change patterns, and known urban development trends.
- "urbanContext": A paragraph placing these changes in broader urban development context (urbanization trends, economic factors, infrastructure patterns).

Be specific about numbers and percentages from the data. Reference the actual location name. Keep each section focused and informative.`
}

function buildUserPrompt(
  location: LocationInfo,
  yearA: number,
  yearB: number,
  stats: ChangeStats,
): string {
  const parts = [
    `Location: ${location.displayName} (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`,
    `Time period: ${yearA} → ${yearB}`,
    '',
    `Buildings in ${yearA}: ${stats.totalBuildingsYearA}`,
    `Buildings in ${yearB}: ${stats.totalBuildingsYearB}`,
    `New buildings: ${stats.addedCount}`,
    `Removed buildings: ${stats.removedCount}`,
    `Modified buildings: ${stats.modifiedCount}`,
    `Net building area change: ${stats.netAreaChangeM2 > 0 ? '+' : ''}${Math.round(stats.netAreaChangeM2)} m²`,
  ]

  if (stats.landUseShifts.length > 0) {
    parts.push('', 'Land use changes:')
    for (const shift of stats.landUseShifts) {
      parts.push(`  ${shift.from} → ${shift.to}: ${shift.count} areas`)
    }
  }

  return parts.join('\n')
}

export async function generateNarrative(
  location: LocationInfo,
  yearA: number,
  yearB: number,
  stats: ChangeStats,
): Promise<AiNarrative> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error(
      'Missing VITE_OPENROUTER_API_KEY. Get a key at openrouter.ai, add it to .env.local, and restart the dev server.',
    )
  }

  const result = await withRetry(async () => {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-OpenRouter-Title': 'Romefy Urban Change Detector',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(location, yearA, yearB, stats) },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      throw new Error(`${response.status}`)
    }

    return response.json()
  })

  const content = result.choices?.[0]?.message?.content ?? ''
  const text = stripMarkdownFences(content)
  const parsed = JSON.parse(text)

  return {
    overview: parsed.overview ?? '',
    keyChanges: parsed.keyChanges ?? '',
    possibleDrivers: parsed.possibleDrivers ?? '',
    urbanContext: parsed.urbanContext ?? '',
    fullText: `${parsed.overview}\n\n${parsed.keyChanges}\n\n${parsed.possibleDrivers}\n\n${parsed.urbanContext}`,
  }
}
```

**Step 2: Verify**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/urban-change-ai.ts
git commit -m "feat(urban-change): add OpenRouter AI narration service"
```

---

### Task 9: Create Analysis Composable

**Files:**
- Create: `src/composables/useUrbanAnalysis.ts`

**Step 1: Create the composable**

Create `src/composables/useUrbanAnalysis.ts`. This orchestrates the full analysis pipeline (fetch Year A → fetch Year B → diff → AI narrate):

```typescript
import { useUrbanChangeStore } from '@/stores/urban-change'
import { fetchOverpassData } from '@/services/overpass-api'
import { computeChangeSummary } from '@/services/urban-change-diff'
import { generateNarrative } from '@/services/urban-change-ai'

export function useUrbanAnalysis() {
  const store = useUrbanChangeStore()

  async function runAnalysis() {
    if (!store.selectedBounds || !store.selectedLocation) return

    store.goToStage(3)
    store.setAnalysisError(null)

    try {
      // Step 1: Fetch Year A data
      store.setAnalysisState('fetching-old')
      const dataA = await fetchOverpassData(store.selectedBounds, store.yearA, store.focusFilter)

      // Step 2: Fetch Year B data
      store.setAnalysisState('fetching-new')
      const dataB = await fetchOverpassData(store.selectedBounds, store.yearB, store.focusFilter)

      // Step 3: Compute diff
      store.setAnalysisState('diffing')
      const summary = computeChangeSummary(
        dataA.buildings,
        dataB.buildings,
        dataA.landUse,
        dataB.landUse,
      )
      store.setChangeSummary(summary)

      // Step 4: Generate AI narrative
      store.setAnalysisState('ai-narrating')
      store.setAiState('loading')
      const narrative = await generateNarrative(
        store.selectedLocation,
        store.yearA,
        store.yearB,
        summary.stats,
      )
      store.setAiNarrative(narrative)
      store.setAiState('done')

      store.setAnalysisState('done')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      store.setAnalysisError(message)
      store.setAnalysisState('error')
      store.setAiState('error')
    }
  }

  return { runAnalysis }
}
```

**Step 2: Verify**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/composables/useUrbanAnalysis.ts
git commit -m "feat(urban-change): add analysis orchestration composable"
```

---

### Task 10: Create Stage 1 Components — Header + Location Search + Map

This is a large UI task. Use the `frontend-design` skill before writing any template/CSS code to ensure production-grade visual quality.

**Files:**
- Create: `src/components/urban-change/UrbanChangeHeader.vue`
- Create: `src/components/urban-change/UrbanChangeSelectView.vue`
- Modify: `src/assets/main.css` (add urban-change section)
- Modify: `src/views/UrbanChangeApp.vue`

**Step 1: Create UrbanChangeHeader.vue**

Stage navigation header with 3 circles (same pattern as `EcgAnalyzerHeader.vue`). Shows: "Select Location" → "Configure" → "Results". Has a "Back to Portfolio" link.

**Step 2: Create UrbanChangeSelectView.vue**

Stage 1 view with:
- Search bar at top (debounced Nominatim lookup, shows dropdown results)
- Full-screen Leaflet map below the search bar
- Leaflet.draw rectangle tool for area selection
- Quick-start city buttons (Dubai, Shenzhen, Singapore, Austin) below the search bar
- Sidebar/panel showing selected area info (coordinates, estimated km²)
- "Analyze This Area" button (disabled until a rectangle is drawn)
- Area size validation: if > 5 km², show warning and disable button

**Step 3: Add CSS classes to `src/assets/main.css`**

Add a new section for urban-change prefixed classes: `uc-app`, `uc-header`, `uc-map-container`, `uc-search-bar`, `uc-search-results`, `uc-quick-start`, `uc-sidebar`, `uc-primary-btn`, etc. Follow the dark theme.

**Step 4: Update UrbanChangeApp.vue**

Wire up the header and stage-based conditional rendering with transitions (same pattern as `EcgAnalyzerApp.vue`):

```vue
<template>
  <div class="uc-app">
    <UrbanChangeHeader />
    <transition :name="transitionName" mode="out-in">
      <UrbanChangeSelectView v-if="store.currentStage === 1" key="select" />
      <UrbanChangeConfigView v-else-if="store.currentStage === 2" key="config" />
      <UrbanChangeResultsView v-else key="results" />
    </transition>
  </div>
</template>
```

Import store, watch `currentStage` for transition direction, add `onBeforeRouteLeave` reset.

**Step 5: Verify**

Run: `npm run dev`
Visit: `http://localhost:5173/urban-change`
Verify: map renders, search works, rectangle selection works, quick-start cities fly to location.

**Step 6: Commit**

```bash
git add src/components/urban-change/ src/views/UrbanChangeApp.vue src/assets/main.css
git commit -m "feat(urban-change): add Stage 1 — location search and map selection"
```

---

### Task 11: Create Stage 2 — Configure Analysis View

**Files:**
- Create: `src/components/urban-change/UrbanChangeConfigView.vue`
- Modify: `src/assets/main.css`

**Step 1: Create UrbanChangeConfigView.vue**

Configuration form with:
- A mini-map preview showing the selected area (static Leaflet map with the rectangle overlaid)
- Location name display
- Year A selector: dropdown or slider, range 2007–2025
- Year B selector: dropdown or slider, range 2007–2025, must be > Year A
- Focus filter: radio buttons or segmented control for "Buildings", "Land Use", "All"
- "Run Analysis" button
- "Back" button to return to Stage 1

**Step 2: Add CSS classes**

Add classes for the config form: `uc-config-page`, `uc-config-card`, `uc-year-selector`, `uc-focus-filter`, `uc-mini-map`, etc.

**Step 3: Verify**

Run: `npm run dev`
Navigate through Stage 1 → Stage 2. Verify year pickers work, focus filter toggles, button states correct.

**Step 4: Commit**

```bash
git add src/components/urban-change/UrbanChangeConfigView.vue src/assets/main.css
git commit -m "feat(urban-change): add Stage 2 — analysis configuration"
```

---

### Task 12: Create Stage 3 — Results Dashboard (Map + Stats)

**Files:**
- Create: `src/components/urban-change/UrbanChangeResultsView.vue`
- Create: `src/components/urban-change/UrbanChangeStatsCards.vue`
- Create: `src/components/urban-change/UrbanChangeResultsMap.vue`
- Modify: `src/assets/main.css`

**Step 1: Create UrbanChangeResultsMap.vue**

Leaflet map component that renders GeoJSON change overlays:
- Green polygons for added buildings
- Red polygons for removed buildings
- Yellow polygons for modified buildings
- Clickable polygons showing tooltip with building details
- Toggle buttons (top-right) to show/hide each change type
- Fits map to the analysis bounds

**Step 2: Create UrbanChangeStatsCards.vue**

Stats cards component showing:
- New buildings count (green card)
- Removed buildings count (red card)
- Modified buildings count (yellow card)
- Net area change in m² / km²
- Land use shift summary
- Same color-coding pattern as existing dashboard cards

**Step 3: Create UrbanChangeResultsView.vue**

Main results layout:
- Loading state with progress message showing current step ("Fetching 2015 data...", "Fetching 2024 data...", "Computing changes...", "Generating AI analysis...")
- Error state with retry button
- Split view when done: map on left (~60% width), panel on right (~40% width)
- Right panel contains: stats cards at top, AI narrative below
- "Back" button to return to Stage 2
- "Export PDF" button
- "New Analysis" button to restart

**Step 4: Add CSS classes**

Add: `uc-results-page`, `uc-split-view`, `uc-results-map`, `uc-results-panel`, `uc-stats-grid`, `uc-stat-card`, `uc-stat-card--added`, `uc-stat-card--removed`, `uc-stat-card--modified`, `uc-loading-state`, `uc-error-state`, `uc-toggle-btn`, etc.

**Step 5: Verify**

Run: `npm run dev`
Full flow: search city → draw rectangle → configure years → run analysis → verify results render with colored polygons and stats.

**Step 6: Commit**

```bash
git add src/components/urban-change/ src/assets/main.css
git commit -m "feat(urban-change): add Stage 3 — results dashboard with map overlays and stats"
```

---

### Task 13: Create AI Narrative Panel Component

**Files:**
- Create: `src/components/urban-change/UrbanChangeNarrativePanel.vue`
- Modify: `src/assets/main.css`

**Step 1: Create the narrative panel**

Displays the AI-generated narrative with structured sections:
- "Overview" section header + text
- "Key Changes" section header + text
- "Possible Drivers" section header + text
- "Urban Development Context" section header + text
- Loading skeleton while AI is generating
- Error state if AI fails (with retry button)

**Step 2: Integrate into UrbanChangeResultsView.vue**

Add the narrative panel below the stats cards in the right panel.

**Step 3: Add CSS classes**

Add: `uc-narrative-panel`, `uc-narrative-section`, `uc-narrative-title`, `uc-narrative-text`, `uc-narrative-skeleton`.

**Step 4: Verify**

Run full analysis flow and verify AI narrative renders correctly with section headers.

**Step 5: Commit**

```bash
git add src/components/urban-change/ src/assets/main.css
git commit -m "feat(urban-change): add AI narrative panel with structured sections"
```

---

### Task 14: Add PDF Export

**Files:**
- Create: `src/services/urban-change-pdf.ts`
- Modify: `src/components/urban-change/UrbanChangeResultsView.vue`

**Step 1: Create PDF export service**

Create `src/services/urban-change-pdf.ts` following the same pattern as `pdf-export.ts` and `ecg-pdf-export.ts`:

```typescript
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function exportUrbanChangePdf(elementId: string, locationName: string): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) throw new Error('Dashboard element not found')

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#09090b',
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth - 20
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pageHeight - 20))

  const safeName = locationName.replace(/[^a-zA-Z0-9]/g, '_')
  pdf.save(`urban-change-${safeName}.pdf`)
}
```

**Step 2: Add export button to results view**

Wire the "Export PDF" button in `UrbanChangeResultsView.vue` to call `exportUrbanChangePdf`.

**Step 3: Verify**

Run full flow, click "Export PDF", verify PDF downloads with map and stats.

**Step 4: Commit**

```bash
git add src/services/urban-change-pdf.ts src/components/urban-change/UrbanChangeResultsView.vue
git commit -m "feat(urban-change): add PDF export for analysis dashboard"
```

---

### Task 15: Polish & Final Integration

**Files:**
- Modify: various files for polish

**Step 1: Empty/sparse data states**

Add messages for:
- Zero changes detected: "No significant changes detected between these years."
- Fewer than 5 buildings: "Limited mapping coverage in this area."
- No results from Overpass: "No building data available for this area in the selected year."

**Step 2: Area validation**

In Stage 1, compute the drawn rectangle's area in km². If > 5 km², show a warning badge and disable the "Analyze" button.

**Step 3: Loading state messages**

Map `analysisState` values to user-friendly messages:
- `fetching-old` → "Fetching {yearA} data..."
- `fetching-new` → "Fetching {yearB} data..."
- `diffing` → "Comparing snapshots..."
- `ai-narrating` → "Generating AI analysis..."

**Step 4: Back navigation**

Verify Stage 2 → Stage 1 preserves the drawn rectangle and search.
Verify Stage 3 → Stage 2 preserves configuration.

**Step 5: Full end-to-end test**

Run: `npm run dev`
Test complete flow with Dubai (known strong OSM coverage):
1. Search "Dubai" → map flies to Dubai
2. Draw rectangle over a developed area
3. Configure: 2015 vs 2024, All focus
4. Run Analysis → verify loading states, results, AI narrative
5. Toggle change type visibility on map
6. Click polygons for tooltips
7. Export PDF
8. Navigate back and verify state preservation

**Step 6: Build check**

Run: `npm run build`
Run: `npm run type-check`
Expected: No errors

**Step 7: Commit**

```bash
git add -A
git commit -m "feat(urban-change): polish edge cases, loading states, and validation"
```

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add leaflet, leaflet-draw deps |
| `src/config/projects.ts` | Modify | Register project |
| `src/router/index.ts` | Modify | Add `/urban-change` route |
| `src/types/urban-change.ts` | Create | All TypeScript types |
| `src/stores/urban-change.ts` | Create | Pinia store |
| `src/services/nominatim-api.ts` | Create | Geocoding service |
| `src/services/overpass-api.ts` | Create | Historical OSM data |
| `src/services/urban-change-diff.ts` | Create | Client-side diff engine |
| `src/services/urban-change-ai.ts` | Create | AI narrative generation |
| `src/services/urban-change-pdf.ts` | Create | PDF export |
| `src/composables/useUrbanAnalysis.ts` | Create | Analysis orchestration |
| `src/views/UrbanChangeApp.vue` | Create | Top-level app view |
| `src/components/urban-change/UrbanChangeHeader.vue` | Create | Stage nav header |
| `src/components/urban-change/UrbanChangeSelectView.vue` | Create | Stage 1 |
| `src/components/urban-change/UrbanChangeConfigView.vue` | Create | Stage 2 |
| `src/components/urban-change/UrbanChangeResultsView.vue` | Create | Stage 3 |
| `src/components/urban-change/UrbanChangeResultsMap.vue` | Create | Results map overlay |
| `src/components/urban-change/UrbanChangeStatsCards.vue` | Create | Stats cards |
| `src/components/urban-change/UrbanChangeNarrativePanel.vue` | Create | AI narrative panel |
| `src/assets/main.css` | Modify | All urban-change styles |
