# ECG DSP Pipeline Enhancement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the ECG analyzer's signal processing pipeline to support dual filter modes (diagnostic/monitoring), notch filtering (50/60 Hz), and dedicated baseline wander removal — all user-configurable from Stage 2.

**Architecture:** Three new DSP stages slot into the existing per-lead pipeline between raw input and Pan-Tompkins detection. A `DspConfig` object threads through `analyzeFullEcg()` → `analyzeSingleLead()`. Pinia store holds the config, and the Analyze view exposes controls that trigger re-analysis on change.

**Tech Stack:** Vue 3 (Composition API), TypeScript, Pinia, Tailwind CSS (classes in `main.css` only)

---

### Task 1: Add DSP Types to `src/types/ecg.ts`

**Files:**
- Modify: `src/types/ecg.ts`

**Step 1: Add types after `EcgCanvasConfig` (line 87)**

```typescript
export type FilterMode = 'monitoring' | 'diagnostic'

export type NotchFilterSetting = 'off' | '50' | '60'

export interface DspConfig {
  filterMode: FilterMode
  notchFilter: NotchFilterSetting
}

export const FILTER_MODE_PRESETS: Record<FilterMode, { highpass: number; lowpass: number }> = {
  monitoring: { highpass: 0.5, lowpass: 40 },
  diagnostic: { highpass: 0.05, lowpass: 150 },
}

export const DSP_DEFAULTS: DspConfig = {
  filterMode: 'monitoring',
  notchFilter: 'off',
}
```

**Step 2: Verify build**

Run: `npm run type-check`
Expected: PASS (new types are additive, no existing code breaks)

**Step 3: Commit**

```bash
git add src/types/ecg.ts
git commit -m "feat(ecg): add FilterMode, NotchFilterSetting, and DspConfig types"
```

---

### Task 2: Add Notch Filter to `src/services/ecg-signal-processing.ts`

**Files:**
- Modify: `src/services/ecg-signal-processing.ts`

**Step 1: Add notch filter function after `biquadFilter()` (line 66)**

A second-order IIR notch filter using the standard transfer function `H(z) = (1 - 2cos(w0)z^-1 + z^-2) / (1 - 2cos(w0)·r·z^-1 + r^2·z^-2)` where `r = 1 - (π·BW/fs)` and `BW = f0/Q`.

```typescript
/**
 * Second-order IIR notch (band-reject) filter.
 * Removes a narrow frequency band centred at `f0` Hz.
 * Q ≈ 30 gives a ~1.7 Hz notch width at 50 Hz — tight enough to preserve
 * surrounding ECG content while rejecting powerline interference.
 */
export function notchFilter(
  signal: number[],
  f0: number,
  samplingRate: number,
  Q: number = 30,
): number[] {
  const w0 = (2 * Math.PI * f0) / samplingRate
  const bw = f0 / Q
  const r = 1 - (Math.PI * bw) / samplingRate
  const cosW0 = Math.cos(w0)

  // Normalise so gain = 1 at DC
  const a0 = 1
  const a1 = -2 * cosW0 * r
  const a2 = r * r
  const scale = (1 - 2 * cosW0 + 1) / (a0 + a1 + a2) // DC gain correction
  const b0 = 1 / scale
  const b1 = -2 * cosW0 / scale
  const b2 = 1 / scale

  // Direct Form II biquad
  const out = new Array<number>(signal.length)
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0

  for (let i = 0; i < signal.length; i++) {
    const x0 = signal[i]!
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    out[i] = y0
    x2 = x1; x1 = x0
    y2 = y1; y1 = y0
  }

  return out
}
```

**Step 2: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/services/ecg-signal-processing.ts
git commit -m "feat(ecg): add second-order IIR notch filter for powerline rejection"
```

---

### Task 3: Add Baseline Removal to `src/services/ecg-signal-processing.ts`

**Files:**
- Modify: `src/services/ecg-signal-processing.ts`

**Step 1: Add baseline removal function after `notchFilter()`**

Moving-average subtraction: compute a sliding window average (~0.8 s) and subtract it from the signal. This removes low-frequency drift that the high-pass filter (especially at 0.05 Hz in diagnostic mode) doesn't fully eliminate.

```typescript
/**
 * Baseline wander removal via moving-average subtraction.
 * Computes a slow-moving average (windowSec ≈ 0.8 s) and subtracts it,
 * removing drift while preserving PQRST morphology.
 */
export function removeBaselineWander(
  signal: number[],
  samplingRate: number,
  windowSec: number = 0.8,
): number[] {
  const windowSize = Math.round(windowSec * samplingRate)
  if (windowSize < 1) return [...signal]

  const halfWin = Math.floor(windowSize / 2)
  const len = signal.length
  const out = new Array<number>(len)

  // Compute initial window sum
  let sum = 0
  const firstEnd = Math.min(halfWin + 1, len)
  for (let i = 0; i < firstEnd; i++) {
    sum += signal[i]!
  }

  for (let i = 0; i < len; i++) {
    const wStart = Math.max(0, i - halfWin)
    const wEnd = Math.min(len - 1, i + halfWin)
    const count = wEnd - wStart + 1

    // Slide window: add the new right edge, remove the old left edge
    if (i > 0) {
      const newRight = Math.min(len - 1, i + halfWin)
      const oldLeft = Math.max(0, i - halfWin - 1)
      if (newRight !== Math.min(len - 1, (i - 1) + halfWin)) {
        sum += signal[newRight]!
      }
      if (oldLeft !== Math.max(0, (i - 1) - halfWin)) {
        sum -= signal[oldLeft]!
      }
    }

    // Simple recompute to avoid drift in running sum (clean but O(n·w))
    // For ECG signals (5000 samples, window 400), this is fast enough.
    let localSum = 0
    for (let j = wStart; j <= wEnd; j++) {
      localSum += signal[j]!
    }
    out[i] = signal[i]! - localSum / count
  }

  return out
}
```

**Step 2: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/services/ecg-signal-processing.ts
git commit -m "feat(ecg): add baseline wander removal via moving-average subtraction"
```

---

### Task 4: Parameterize Bandpass Filter & Wire Full DSP Pipeline

**Files:**
- Modify: `src/services/ecg-signal-processing.ts`

This is the integration task — thread `DspConfig` through the pipeline.

**Step 1: Add import for new types at top of file**

```typescript
import type {
  EcgData,
  EcgLeadName,
  RPeakResult,
  RRIntervalStats,
  IntervalMeasurements,
  LeadAnalysis,
  AbnormalityFlag,
  EcgAnalysisResult,
  DspConfig,
} from '@/types/ecg'
import { ECG_LEAD_NAMES, ECG_NORMAL_RANGES, FILTER_MODE_PRESETS, DSP_DEFAULTS } from '@/types/ecg'
```

**Step 2: Update `bandpassFilter()` signature (currently line 17)**

Change from:
```typescript
export function bandpassFilter(signal: number[], samplingRate: number): number[] {
  const highpassed = biquadFilter(signal, computeHighpassCoeffs(0.5, samplingRate))
  return biquadFilter(highpassed, computeLowpassCoeffs(40, samplingRate))
}
```

To:
```typescript
export function bandpassFilter(
  signal: number[],
  samplingRate: number,
  highpassHz: number = 0.5,
  lowpassHz: number = 40,
): number[] {
  const highpassed = biquadFilter(signal, computeHighpassCoeffs(highpassHz, samplingRate))
  return biquadFilter(highpassed, computeLowpassCoeffs(lowpassHz, samplingRate))
}
```

**Step 3: Update `analyzeSingleLead()` to accept and apply `DspConfig` (currently line 411)**

Change from:
```typescript
function analyzeSingleLead(
  leadName: EcgLeadName,
  rawSignal: number[],
  samplingRate: number,
): LeadAnalysis {
  const filteredSignal = bandpassFilter(rawSignal, samplingRate)
  const rPeaks = detectRPeaks(filteredSignal, samplingRate)
```

To:
```typescript
function analyzeSingleLead(
  leadName: EcgLeadName,
  rawSignal: number[],
  samplingRate: number,
  dspConfig: DspConfig = DSP_DEFAULTS,
): LeadAnalysis {
  // 1. Bandpass filter (configurable cutoffs)
  const { highpass, lowpass } = FILTER_MODE_PRESETS[dspConfig.filterMode]
  let processed = bandpassFilter(rawSignal, samplingRate, highpass, lowpass)

  // 2. Notch filter (optional)
  if (dspConfig.notchFilter !== 'off') {
    processed = notchFilter(processed, Number(dspConfig.notchFilter), samplingRate)
  }

  // 3. Baseline wander removal
  processed = removeBaselineWander(processed, samplingRate)

  const rPeaks = detectRPeaks(processed, samplingRate)
  const rrStats = analyzeRRIntervals(rPeaks, samplingRate)
  const heartRate = calculateHeartRate(rrStats)
  const intervals = measureIntervals(processed, rPeaks, samplingRate)

  return { leadName, filteredSignal: processed, rPeaks, rrStats, heartRate, intervals }
}
```

**Step 4: Update `analyzeFullEcg()` signature (currently line 429)**

Change from:
```typescript
export async function analyzeFullEcg(
  ecgData: EcgData,
  onProgress?: (leadIndex: number, total: number) => void,
): Promise<EcgAnalysisResult> {
```

To:
```typescript
export async function analyzeFullEcg(
  ecgData: EcgData,
  onProgress?: (leadIndex: number, total: number) => void,
  dspConfig: DspConfig = DSP_DEFAULTS,
): Promise<EcgAnalysisResult> {
```

And update the inner call (currently line 438):

Change from:
```typescript
    const analysis = analyzeSingleLead(leadName, rawSignal, ecgData.samplingRate)
```

To:
```typescript
    const analysis = analyzeSingleLead(leadName, rawSignal, ecgData.samplingRate, dspConfig)
```

**Step 5: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 6: Commit**

```bash
git add src/services/ecg-signal-processing.ts
git commit -m "feat(ecg): parameterize bandpass filter and wire full DSP pipeline with DspConfig"
```

---

### Task 5: Add DSP Config to Pinia Store

**Files:**
- Modify: `src/stores/ecg-analyzer.ts`

**Step 1: Add imports**

Add to the import block at top:
```typescript
import type {
  EcgData,
  EcgAnalysisResult,
  EcgAiInterpretation,
  EcgAnalyzerStage,
  EcgAnalysisState,
  EcgAiState,
  FilterMode,
  NotchFilterSetting,
} from '@/types/ecg'
```

**Step 2: Add DSP config refs after `aiError` ref (line 21)**

```typescript
  const filterMode = ref<FilterMode>('monitoring')
  const notchFilter = ref<NotchFilterSetting>('off')
```

**Step 3: Add setter functions after `setAiError` (line 65)**

```typescript
  function setFilterMode(mode: FilterMode) {
    filterMode.value = mode
  }

  function setNotchFilter(setting: NotchFilterSetting) {
    notchFilter.value = setting
  }
```

**Step 4: Add `filterMode` and `notchFilter` to `reset()` (line 71)**

Inside `reset()`, after `aiError.value = null` add:
```typescript
    filterMode.value = 'monitoring'
    notchFilter.value = 'off'
```

**Step 5: Add new refs and functions to the return object**

Add to the return statement:
```typescript
    filterMode,
    notchFilter,
    setFilterMode,
    setNotchFilter,
```

**Step 6: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 7: Commit**

```bash
git add src/stores/ecg-analyzer.ts
git commit -m "feat(ecg): add filterMode and notchFilter DSP config to Pinia store"
```

---

### Task 6: Update `useEcgAnalysis` Composable to Pass DSP Config

**Files:**
- Modify: `src/composables/useEcgAnalysis.ts`

**Step 1: Rewrite the composable to pass DSP config from store**

Replace entire file contents with:

```typescript
import { useEcgAnalyzerStore } from '@/stores/ecg-analyzer'
import { analyzeFullEcg } from '@/services/ecg-signal-processing'
import type { EcgData } from '@/types/ecg'

export function useEcgAnalysis() {
  const store = useEcgAnalyzerStore()

  async function runAnalysis(ecgData: EcgData) {
    store.setAnalysisState('analyzing')
    store.setAnalysisProgress(0)
    store.setAnalysisError(null)

    try {
      const dspConfig = {
        filterMode: store.filterMode,
        notchFilter: store.notchFilter,
      }

      const result = await analyzeFullEcg(ecgData, (leadIndex, total) => {
        store.setAnalysisProgress(Math.round((leadIndex / total) * 100))
      }, dspConfig)

      store.setAnalysisResult(result)
      store.setAnalysisState('complete')
    } catch (error) {
      store.setAnalysisError(
        error instanceof Error ? error.message : 'Signal processing failed.',
      )
      store.setAnalysisState('error')
    }
  }

  return { runAnalysis }
}
```

**Step 2: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/composables/useEcgAnalysis.ts
git commit -m "feat(ecg): pass DspConfig from store through analysis pipeline"
```

---

### Task 7: Add DSP Control Bar CSS to `src/assets/main.css`

**Files:**
- Modify: `src/assets/main.css`

**Step 1: Add styles after `.ecg-analyze-page` block (after line 3868)**

Insert immediately before `/* ── Metrics Panel ── */` comment:

```css
/* ── DSP Controls ── */

.ecg-dsp-controls {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.875rem 1.25rem;
  border-radius: 0.75rem;
  background-color: var(--color-surface-100);
  border: 1px solid var(--color-surface-300);
  flex-wrap: wrap;
}

.ecg-dsp-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ecg-dsp-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-surface-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.ecg-dsp-toggle {
  display: inline-flex;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid var(--color-surface-300);
}

.ecg-dsp-option {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-surface-600);
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.ecg-dsp-option:not(:last-child) {
  border-right: 1px solid var(--color-surface-300);
}

.ecg-dsp-option:hover {
  background-color: var(--color-surface-200);
}

.ecg-dsp-option.is-active {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  color: white;
  font-weight: 600;
}

.ecg-dsp-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ecg-dsp-warning {
  font-size: 0.6875rem;
  color: #fbbf24;
  font-style: italic;
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS (CSS compiles without errors)

**Step 3: Commit**

```bash
git add src/assets/main.css
git commit -m "feat(ecg): add CSS classes for DSP control bar"
```

---

### Task 8: Add DSP Controls UI to `EcgAnalyzeView.vue`

**Files:**
- Modify: `src/views/EcgAnalyzeView.vue`

**Step 1: Add DSP control handlers in `<script setup>`**

After `const { runAnalysis } = useEcgAnalysis()` (line 11), add:

```typescript
import type { FilterMode, NotchFilterSetting } from '@/types/ecg'

function setFilterMode(mode: FilterMode) {
  store.setFilterMode(mode)
  if (store.ecgData) runAnalysis(store.ecgData)
}

function setNotchFilter(setting: NotchFilterSetting) {
  store.setNotchFilter(setting)
  if (store.ecgData) runAnalysis(store.ecgData)
}

const lowSampleRateForDiagnostic = computed(() => {
  return store.ecgData ? store.ecgData.samplingRate < 500 : false
})
```

Also add `computed` to the vue import:
```typescript
import { onMounted, computed } from 'vue'
```

**Step 2: Add DSP control bar in template**

Inside the results `<div>`, insert the control bar as the first child (before `<EcgMetricsPanel>`):

```html
    <!-- Results -->
    <div v-else-if="store.analysisState === 'complete' && store.analysisResult" class="ecg-results">
      <!-- DSP Controls -->
      <div class="ecg-dsp-controls">
        <div class="ecg-dsp-group">
          <span class="ecg-dsp-label">Filter Mode</span>
          <div class="ecg-dsp-toggle">
            <button
              class="ecg-dsp-option"
              :class="{ 'is-active': store.filterMode === 'monitoring' }"
              @click="setFilterMode('monitoring')"
            >
              Monitoring
            </button>
            <button
              class="ecg-dsp-option"
              :class="{ 'is-active': store.filterMode === 'diagnostic' }"
              @click="setFilterMode('diagnostic')"
            >
              Diagnostic
            </button>
          </div>
          <span v-if="store.filterMode === 'diagnostic' && lowSampleRateForDiagnostic" class="ecg-dsp-warning">
            Sample rate &lt;500 Hz — results may be unreliable
          </span>
        </div>

        <div class="ecg-dsp-group">
          <span class="ecg-dsp-label">Notch Filter</span>
          <div class="ecg-dsp-toggle">
            <button
              class="ecg-dsp-option"
              :class="{ 'is-active': store.notchFilter === 'off' }"
              @click="setNotchFilter('off')"
            >
              Off
            </button>
            <button
              class="ecg-dsp-option"
              :class="{ 'is-active': store.notchFilter === '50' }"
              @click="setNotchFilter('50')"
            >
              50 Hz
            </button>
            <button
              class="ecg-dsp-option"
              :class="{ 'is-active': store.notchFilter === '60' }"
              @click="setNotchFilter('60')"
            >
              60 Hz
            </button>
          </div>
        </div>
      </div>

      <EcgMetricsPanel :result="store.analysisResult" />
```

**Step 3: Verify build**

Run: `npm run type-check && npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/views/EcgAnalyzeView.vue
git commit -m "feat(ecg): add DSP filter mode and notch filter controls to Analyze view"
```

---

### Task 9: Manual Verification & Final Build

**Step 1: Full production build**

Run: `npm run build`
Expected: PASS with no errors or warnings

**Step 2: Start dev server**

Run: `npm run dev`

**Step 3: Manual verification checklist**

1. Navigate to `/ecg-analyzer`
2. Upload a sample ECG (e.g. Normal Sinus Rhythm)
3. On Stage 2, verify the DSP control bar appears above the metrics panel
4. Default state: Filter Mode = Monitoring, Notch = Off
5. Click "Diagnostic" → full re-analysis runs with progress bar → canvas redraws
6. Click "50 Hz" notch → re-analysis runs again
7. Switch back to "Monitoring" → re-analysis runs
8. If sample rate < 500 Hz and Diagnostic selected, warning text appears
9. Proceed to Stage 3 → AI report still generates correctly
10. Go back to Stage 2 → controls retain their state

**Step 4: Commit any fixes if needed, then final build check**

Run: `npm run build`
Expected: PASS
