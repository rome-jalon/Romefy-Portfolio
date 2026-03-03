# Lead II ECG Monitor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a live Lead II ECG monitoring station where a technician reviews auto-analyzed readings, flags concerns, and simulates pushing notifications to a client care team.

**Architecture:** New portfolio route (`/ecg-monitor`) with its own Pinia store, composables, and components. A client-side PQRST generator feeds Lead II samples into a ring buffer. A Canvas2D sweep-line consumes samples in real time. Every 10 seconds, the accumulated segment is analyzed via the existing DSP pipeline + AI interpretation. The technician reviews findings and can confirm, flag, or override.

**Tech Stack:** Vue 3 (Composition API), TypeScript, Pinia, Canvas2D, requestAnimationFrame, existing DSP functions from `ecg-signal-processing.ts`, existing AI service from `ecg-ai-interpretation.ts`, Tailwind CSS (classes in `main.css` only)

---

### Task 1: Monitor Types

**Files:**
- Create: `src/types/ecg-monitor.ts`

**Step 1: Create the types file**

All types specific to the monitor app. Reuses existing types from `ecg.ts` where applicable.

```typescript
import type {
  IntervalMeasurements,
  RRIntervalStats,
  AbnormalityFlag,
  EcgAiInterpretation,
} from '@/types/ecg'

export interface MonitorWaveParams {
  pDur: number
  prSeg: number
  qDur: number
  rDur: number
  sDur: number
  stSeg: number
  tDur: number
  pAmp: number
  rAmp: number
  qAmp: number
  sAmpBase: number
  tAmp: number
}

export interface MonitorPatientProfile {
  id: string
  name: string
  condition: string
  rrMs: number
  irregular: boolean
  rrRange: [number, number]
  waveParams: MonitorWaveParams
  powerline: { frequency: number; amplitude: number }
  wander: { frequency: number; amplitude: number }
}

export type MonitorUrgency = 'routine' | 'urgent' | 'critical'

export type MonitorReviewStatus = 'pending' | 'confirmed' | 'flagged' | 'overridden'

export interface MonitorNotification {
  id: string
  timestamp: Date
  patientId: string
  patientName: string
  urgency: MonitorUrgency
  finding: string
  technicianNote: string
}

export interface MonitorAnalysisResult {
  heartRate: number | null
  rhythm: string
  rrStats: RRIntervalStats | null
  intervals: IntervalMeasurements
  abnormalities: AbnormalityFlag[]
  filteredSignal: number[]
}

export type MonitorAnalysisState = 'idle' | 'analyzing' | 'complete' | 'error'

export type MonitorAiState = 'idle' | 'loading' | 'complete' | 'error'
```

**Step 2: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/types/ecg-monitor.ts
git commit -m "feat(monitor): add Lead II monitor types"
```

---

### Task 2: Patient Profiles Config

**Files:**
- Create: `src/config/monitor-patients.ts`

**Step 1: Create 8 patient profiles**

Each profile matches the design doc table. Wave params use Lead II multipliers (P=1.0, R=1.0, T=1.0) since this is Lead II only. The params mirror the existing sample generator's format.

```typescript
import type { MonitorPatientProfile } from '@/types/ecg-monitor'

export const MONITOR_PATIENTS: MonitorPatientProfile[] = [
  {
    id: 'P-001',
    name: 'Patient P-001',
    condition: 'Normal Sinus Rhythm',
    rrMs: 833,
    irregular: false,
    rrRange: [780, 880],
    waveParams: {
      pDur: 80, prSeg: 60, qDur: 20, rDur: 30, sDur: 30, stSeg: 80, tDur: 160,
      pAmp: 0.20, rAmp: 1.2, qAmp: -0.1, sAmpBase: -0.3, tAmp: 0.30,
    },
    powerline: { frequency: 60, amplitude: 0.08 },
    wander: { frequency: 0.15, amplitude: 0.2 },
  },
  {
    id: 'P-002',
    name: 'Patient P-002',
    condition: 'Sinus Bradycardia',
    rrMs: 1250,
    irregular: false,
    rrRange: [1150, 1350],
    waveParams: {
      pDur: 80, prSeg: 70, qDur: 20, rDur: 28, sDur: 30, stSeg: 90, tDur: 170,
      pAmp: 0.22, rAmp: 1.3, qAmp: -0.1, sAmpBase: -0.3, tAmp: 0.32,
    },
    powerline: { frequency: 50, amplitude: 0.1 },
    wander: { frequency: 0.2, amplitude: 0.25 },
  },
  {
    id: 'P-003',
    name: 'Patient P-003',
    condition: 'Sinus Tachycardia',
    rrMs: 522,
    irregular: false,
    rrRange: [490, 560],
    waveParams: {
      pDur: 70, prSeg: 50, qDur: 18, rDur: 28, sDur: 28, stSeg: 60, tDur: 130,
      pAmp: 0.18, rAmp: 1.1, qAmp: -0.08, sAmpBase: -0.25, tAmp: 0.25,
    },
    powerline: { frequency: 60, amplitude: 0.12 },
    wander: { frequency: 0.25, amplitude: 0.3 },
  },
  {
    id: 'P-004',
    name: 'Patient P-004',
    condition: 'Atrial Fibrillation',
    rrMs: 700,
    irregular: true,
    rrRange: [450, 1100],
    waveParams: {
      pDur: 40, prSeg: 30, qDur: 20, rDur: 30, sDur: 30, stSeg: 80, tDur: 150,
      pAmp: 0.04, rAmp: 1.15, qAmp: -0.1, sAmpBase: -0.3, tAmp: 0.28,
    },
    powerline: { frequency: 50, amplitude: 0.12 },
    wander: { frequency: 0.3, amplitude: 0.4 },
  },
  {
    id: 'P-005',
    name: 'Patient P-005',
    condition: 'First-Degree AV Block',
    rrMs: 882,
    irregular: false,
    rrRange: [830, 930],
    waveParams: {
      pDur: 90, prSeg: 130, qDur: 20, rDur: 30, sDur: 30, stSeg: 80, tDur: 160,
      pAmp: 0.22, rAmp: 1.2, qAmp: -0.1, sAmpBase: -0.3, tAmp: 0.30,
    },
    powerline: { frequency: 50, amplitude: 0.15 },
    wander: { frequency: 0.22, amplitude: 0.3 },
  },
  {
    id: 'P-006',
    name: 'Patient P-006',
    condition: 'ST Elevation (STEMI)',
    rrMs: 750,
    irregular: false,
    rrRange: [700, 800],
    waveParams: {
      pDur: 78, prSeg: 58, qDur: 22, rDur: 28, sDur: 28, stSeg: 100, tDur: 180,
      pAmp: 0.18, rAmp: 1.0, qAmp: -0.18, sAmpBase: -0.25, tAmp: 0.55,
    },
    powerline: { frequency: 60, amplitude: 0.1 },
    wander: { frequency: 0.25, amplitude: 0.3 },
  },
  {
    id: 'P-007',
    name: 'Patient P-007',
    condition: 'Prolonged QT',
    rrMs: 923,
    irregular: false,
    rrRange: [870, 970],
    waveParams: {
      pDur: 80, prSeg: 60, qDur: 20, rDur: 30, sDur: 30, stSeg: 120, tDur: 220,
      pAmp: 0.20, rAmp: 1.2, qAmp: -0.1, sAmpBase: -0.3, tAmp: 0.35,
    },
    powerline: { frequency: 60, amplitude: 0.08 },
    wander: { frequency: 0.2, amplitude: 0.2 },
  },
  {
    id: 'P-008',
    name: 'Patient P-008',
    condition: 'Wide QRS Complex',
    rrMs: 750,
    irregular: false,
    rrRange: [700, 800],
    waveParams: {
      pDur: 80, prSeg: 60, qDur: 35, rDur: 50, sDur: 50, stSeg: 70, tDur: 170,
      pAmp: 0.20, rAmp: 1.3, qAmp: -0.15, sAmpBase: -0.4, tAmp: 0.35,
    },
    powerline: { frequency: 50, amplitude: 0.1 },
    wander: { frequency: 0.15, amplitude: 0.25 },
  },
]

export const SAMPLING_RATE = 500
export const SEGMENT_DURATION = 10 // seconds
export const SEGMENT_SAMPLES = SAMPLING_RATE * SEGMENT_DURATION // 5000
```

**Step 2: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/config/monitor-patients.ts
git commit -m "feat(monitor): add 8 simulated patient profiles for Lead II feed"
```

---

### Task 3: Patient Feed Composable

**Files:**
- Create: `src/composables/useMonitorFeed.ts`

**Step 1: Create the composable**

This generates Lead II PQRST samples continuously using the same Gaussian approach as `generate-ecg-samples.mjs`, but in TypeScript, Lead II only, and feeding into a ring buffer.

```typescript
import { ref, shallowRef } from 'vue'
import type { MonitorPatientProfile, MonitorWaveParams } from '@/types/ecg-monitor'
import { MONITOR_PATIENTS, SAMPLING_RATE, SEGMENT_SAMPLES } from '@/config/monitor-patients'

function gaussian(t: number, center: number, width: number, amplitude: number): number {
  const z = (t - center) / width
  return amplitude * Math.exp(-0.5 * z * z)
}

function randn(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function generateBeatSamples(beatSamples: number, params: MonitorWaveParams): number[] {
  const { pDur, prSeg, qDur, rDur, sDur, stSeg, tDur, pAmp, rAmp, qAmp, sAmpBase, tAmp } = params

  const pD = pDur / 1000
  const prS = prSeg / 1000
  const qD = qDur / 1000
  const rD = rDur / 1000
  const sD = sDur / 1000
  const stS = stSeg / 1000
  const tD = tDur / 1000

  const pCenter = pD / 2
  const prEnd = pD + prS
  const qCenter = prEnd + qD / 2
  const rCenter = prEnd + qD + rD / 2
  const sCenter = prEnd + qD + rD + sD / 2
  const stEnd = prEnd + qD + rD + sD + stS
  const tCenter = stEnd + tD / 2

  const pSigma = pD / 4
  const qSigma = qD / 4
  const rSigma = rD / 4
  const sSigma = sD / 4
  const tSigma = tD / 4

  const dt = 1 / SAMPLING_RATE
  const samples = new Array<number>(beatSamples)

  for (let i = 0; i < beatSamples; i++) {
    const t = i * dt
    let val = 0
    val += gaussian(t, pCenter, pSigma, pAmp)
    val += gaussian(t, qCenter, qSigma, qAmp)
    val += gaussian(t, rCenter, rSigma, rAmp)
    val += gaussian(t, sCenter, sSigma, sAmpBase)
    val += gaussian(t, tCenter, tSigma, tAmp)
    val += randn() * 0.02
    samples[i] = val
  }

  return samples
}

export function useMonitorFeed() {
  const currentPatientIndex = ref(0)
  const currentPatient = shallowRef<MonitorPatientProfile>(MONITOR_PATIENTS[0]!)
  const buffer = shallowRef<number[]>([])
  const segmentReady = ref(false)
  const lastSegment = shallowRef<number[]>([])

  let sampleCount = 0
  let beatBuffer: number[] = []
  let beatPosition = 0
  let globalSampleIndex = 0

  function generateNextBeat(): number[] {
    const patient = currentPatient.value
    let rrSamples: number
    if (patient.irregular) {
      const rrMs = patient.rrRange[0] + Math.random() * (patient.rrRange[1] - patient.rrRange[0])
      rrSamples = Math.round((rrMs / 1000) * SAMPLING_RATE)
    } else {
      rrSamples = Math.round((patient.rrMs / 1000) * SAMPLING_RATE)
    }
    return generateBeatSamples(rrSamples, patient.waveParams)
  }

  function getNextSample(): number {
    if (beatPosition >= beatBuffer.length) {
      beatBuffer = generateNextBeat()
      beatPosition = 0
    }

    let sample = beatBuffer[beatPosition]!
    const t = globalSampleIndex / SAMPLING_RATE
    const patient = currentPatient.value

    // Add powerline noise
    sample += patient.powerline.amplitude * Math.sin(2 * Math.PI * patient.powerline.frequency * t)
    // Add baseline wander
    sample += patient.wander.amplitude * Math.sin(2 * Math.PI * patient.wander.frequency * t)

    beatPosition++
    globalSampleIndex++
    return sample
  }

  function consumeSamples(count: number): number[] {
    const samples: number[] = []
    for (let i = 0; i < count; i++) {
      const sample = getNextSample()
      samples.push(sample)
      sampleCount++

      if (sampleCount >= SEGMENT_SAMPLES) {
        lastSegment.value = [...buffer.value, ...samples]
        segmentReady.value = true
        sampleCount = 0
        buffer.value = []
        return samples
      }
    }
    buffer.value = [...buffer.value, ...samples]
    return samples
  }

  function switchPatient(index: number) {
    currentPatientIndex.value = index % MONITOR_PATIENTS.length
    currentPatient.value = MONITOR_PATIENTS[currentPatientIndex.value]!
    buffer.value = []
    lastSegment.value = []
    segmentReady.value = false
    sampleCount = 0
    beatBuffer = []
    beatPosition = 0
    globalSampleIndex = 0
  }

  function nextPatient() {
    switchPatient(currentPatientIndex.value + 1)
  }

  function acknowledgeSegment() {
    segmentReady.value = false
  }

  return {
    currentPatient,
    currentPatientIndex,
    buffer,
    segmentReady,
    lastSegment,
    consumeSamples,
    switchPatient,
    nextPatient,
    acknowledgeSegment,
  }
}
```

**Step 2: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/composables/useMonitorFeed.ts
git commit -m "feat(monitor): add Lead II patient feed composable with PQRST generator"
```

---

### Task 4: Pinia Store

**Files:**
- Create: `src/stores/ecg-monitor.ts`

**Step 1: Create the store**

```typescript
import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type {
  MonitorPatientProfile,
  MonitorAnalysisResult,
  MonitorAnalysisState,
  MonitorAiState,
  MonitorNotification,
  MonitorReviewStatus,
  MonitorUrgency,
} from '@/types/ecg-monitor'
import type { EcgAiInterpretation } from '@/types/ecg'

export const useEcgMonitorStore = defineStore('ecg-monitor', () => {
  // Patient state
  const currentPatient = shallowRef<MonitorPatientProfile | null>(null)

  // Analysis state
  const analysisResult = shallowRef<MonitorAnalysisResult | null>(null)
  const analysisState = ref<MonitorAnalysisState>('idle')
  const aiInterpretation = shallowRef<EcgAiInterpretation | null>(null)
  const aiState = ref<MonitorAiState>('idle')
  const aiError = ref<string | null>(null)

  // Review state
  const reviewStatus = ref<MonitorReviewStatus>('pending')
  const overrideNote = ref('')
  const overrideRhythm = ref('')

  // Notification state
  const notifications = ref<MonitorNotification[]>([])
  const activeToast = shallowRef<MonitorNotification | null>(null)
  const notificationLogOpen = ref(false)

  // Live display
  const displayHeartRate = ref<number | null>(null)
  const displayRhythm = ref('--')

  function setPatient(patient: MonitorPatientProfile) {
    currentPatient.value = patient
    analysisResult.value = null
    analysisState.value = 'idle'
    aiInterpretation.value = null
    aiState.value = 'idle'
    aiError.value = null
    reviewStatus.value = 'pending'
    overrideNote.value = ''
    overrideRhythm.value = ''
    displayHeartRate.value = null
    displayRhythm.value = '--'
  }

  function setAnalysisResult(result: MonitorAnalysisResult) {
    analysisResult.value = result
    analysisState.value = 'complete'
    if (result.heartRate !== null) {
      displayHeartRate.value = Math.round(result.heartRate)
    }
    displayRhythm.value = result.rhythm
    reviewStatus.value = 'pending'
    overrideNote.value = ''
    overrideRhythm.value = ''
  }

  function setAnalysisState(state: MonitorAnalysisState) {
    analysisState.value = state
  }

  function setAiInterpretation(interpretation: EcgAiInterpretation) {
    aiInterpretation.value = interpretation
    aiState.value = 'complete'
  }

  function setAiState(state: MonitorAiState) {
    aiState.value = state
  }

  function setAiError(error: string | null) {
    aiError.value = error
  }

  function confirmReading() {
    reviewStatus.value = 'confirmed'
  }

  function overrideFindings(rhythm: string, note: string) {
    reviewStatus.value = 'overridden'
    overrideRhythm.value = rhythm
    overrideNote.value = note
  }

  function sendNotification(urgency: MonitorUrgency, note: string) {
    if (!currentPatient.value || !analysisResult.value) return

    const finding = analysisResult.value.abnormalities.length > 0
      ? analysisResult.value.abnormalities[0]!.name
      : currentPatient.value.condition

    const notification: MonitorNotification = {
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
      patientId: currentPatient.value.id,
      patientName: currentPatient.value.name,
      urgency,
      finding,
      technicianNote: note,
    }

    notifications.value = [...notifications.value, notification]
    activeToast.value = notification
    reviewStatus.value = 'flagged'
  }

  function dismissToast() {
    activeToast.value = null
  }

  function toggleNotificationLog() {
    notificationLogOpen.value = !notificationLogOpen.value
  }

  function reset() {
    currentPatient.value = null
    analysisResult.value = null
    analysisState.value = 'idle'
    aiInterpretation.value = null
    aiState.value = 'idle'
    aiError.value = null
    reviewStatus.value = 'pending'
    overrideNote.value = ''
    overrideRhythm.value = ''
    notifications.value = []
    activeToast.value = null
    notificationLogOpen.value = false
    displayHeartRate.value = null
    displayRhythm.value = '--'
  }

  return {
    currentPatient,
    analysisResult,
    analysisState,
    aiInterpretation,
    aiState,
    aiError,
    reviewStatus,
    overrideNote,
    overrideRhythm,
    notifications,
    activeToast,
    notificationLogOpen,
    displayHeartRate,
    displayRhythm,
    setPatient,
    setAnalysisResult,
    setAnalysisState,
    setAiInterpretation,
    setAiState,
    setAiError,
    confirmReading,
    overrideFindings,
    sendNotification,
    dismissToast,
    toggleNotificationLog,
    reset,
  }
})
```

**Step 2: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/stores/ecg-monitor.ts
git commit -m "feat(monitor): add Pinia store for Lead II monitor state"
```

---

### Task 5: Monitor Analysis Composable

**Files:**
- Create: `src/composables/useMonitorAnalysis.ts`

**Step 1: Create the composable**

Runs the existing DSP pipeline on a Lead II segment, then calls AI interpretation. Wraps the segment into the `EcgAnalysisResult` format that `generateEcgInterpretation` expects.

```typescript
import { useEcgMonitorStore } from '@/stores/ecg-monitor'
import {
  bandpassFilter,
  notchFilter,
  removeBaselineWander,
  detectRPeaks,
  analyzeRRIntervals,
  calculateHeartRate,
  measureIntervals,
  assessRhythmRegularity,
  detectAbnormalities,
} from '@/services/ecg-signal-processing'
import { generateEcgInterpretation } from '@/services/ecg-ai-interpretation'
import { SAMPLING_RATE } from '@/config/monitor-patients'
import type { MonitorAnalysisResult } from '@/types/ecg-monitor'
import type { EcgAnalysisResult, LeadAnalysis } from '@/types/ecg'

export function useMonitorAnalysis() {
  const store = useEcgMonitorStore()

  function analyzeSegment(rawSignal: number[]): MonitorAnalysisResult {
    // 1. Bandpass filter (monitoring mode: 0.5-40 Hz)
    let processed = bandpassFilter(rawSignal, SAMPLING_RATE, 0.5, 40)

    // 2. Notch filter (60 Hz default — patient-specific could be used)
    processed = notchFilter(processed, 60, SAMPLING_RATE)

    // 3. Baseline wander removal
    processed = removeBaselineWander(processed, SAMPLING_RATE)

    // 4. Pan-Tompkins QRS detection
    const rPeaks = detectRPeaks(processed, SAMPLING_RATE)
    const rrStats = analyzeRRIntervals(rPeaks, SAMPLING_RATE)
    const heartRate = calculateHeartRate(rrStats)
    const intervals = measureIntervals(processed, rPeaks, SAMPLING_RATE)
    const rhythm = assessRhythmRegularity(rrStats)
    const abnormalities = detectAbnormalities(heartRate, intervals, rrStats)

    return {
      heartRate,
      rhythm,
      rrStats,
      intervals,
      abnormalities,
      filteredSignal: processed,
    }
  }

  function buildAnalysisResultForAi(result: MonitorAnalysisResult): EcgAnalysisResult {
    const leadAnalysis: LeadAnalysis = {
      leadName: 'II',
      filteredSignal: result.filteredSignal,
      rPeaks: detectRPeaks(result.filteredSignal, SAMPLING_RATE),
      rrStats: result.rrStats,
      heartRate: result.heartRate,
      intervals: result.intervals,
    }

    return {
      leadAnalyses: [leadAnalysis],
      aggregateHeartRate: result.heartRate ?? 0,
      aggregateRhythm: result.rhythm,
      aggregateRRStats: result.rrStats ?? { intervals: [], mean: 0, stdDev: 0, cv: 0 },
      aggregateIntervals: result.intervals,
      abnormalities: result.abnormalities,
    }
  }

  async function runAnalysis(rawSignal: number[]) {
    store.setAnalysisState('analyzing')

    try {
      const result = analyzeSegment(rawSignal)
      store.setAnalysisResult(result)
    } catch {
      store.setAnalysisState('error')
      return
    }

    // Run AI interpretation in background
    store.setAiState('loading')
    store.setAiError(null)

    try {
      const analysisForAi = buildAnalysisResultForAi(store.analysisResult!)
      const interpretation = await generateEcgInterpretation(analysisForAi)
      store.setAiInterpretation(interpretation)
    } catch (error) {
      store.setAiError(error instanceof Error ? error.message : 'AI interpretation failed.')
      store.setAiState('error')
    }
  }

  return { runAnalysis, analyzeSegment }
}
```

**Step 2: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/composables/useMonitorAnalysis.ts
git commit -m "feat(monitor): add analysis composable wrapping DSP + AI for Lead II segments"
```

---

### Task 6: Sweep Canvas Composable

**Files:**
- Create: `src/composables/useMonitorSweep.ts`

**Step 1: Create the composable**

Handles the requestAnimationFrame loop, ring buffer drawing, sweep-line position, ECG grid, and HR overlay.

```typescript
import { ref, type Ref } from 'vue'
import { SAMPLING_RATE } from '@/config/monitor-patients'

const PAPER_SPEED = 25 // mm/s
const AMPLITUDE_SCALE = 10 // mm/mV
const GRID_COLOR_SMALL = 'rgba(34, 197, 94, 0.06)'
const GRID_COLOR_LARGE = 'rgba(34, 197, 94, 0.15)'
const TRACE_COLOR = '#22c55e'
const SWEEP_BLANK_WIDTH = 20 // px blank region ahead of sweep
const BG_COLOR = '#0a0f14'

export function useMonitorSweep(
  canvasRef: Ref<HTMLCanvasElement | null>,
  getSamples: () => number[],
) {
  const isRunning = ref(false)
  let animationId: number | null = null
  let sweepX = 0
  let displayBuffer: number[] = []
  let sampleAccumulator: number[] = []
  let lastTimestamp = 0

  function getCtx(): CanvasRenderingContext2D | null {
    return canvasRef.value?.getContext('2d') ?? null
  }

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, pxPerMm: number) {
    // Small grid (1mm)
    ctx.strokeStyle = GRID_COLOR_SMALL
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let x = 0; x < w; x += pxPerMm) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = 0; y < h; y += pxPerMm) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()

    // Large grid (5mm)
    ctx.strokeStyle = GRID_COLOR_LARGE
    ctx.lineWidth = 0.8
    ctx.beginPath()
    const large = pxPerMm * 5
    for (let x = 0; x < w; x += large) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = 0; y < h; y += large) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
  }

  function render(timestamp: number) {
    const ctx = getCtx()
    const canvas = canvasRef.value
    if (!ctx || !canvas) {
      animationId = requestAnimationFrame(render)
      return
    }

    if (lastTimestamp === 0) lastTimestamp = timestamp
    const dt = (timestamp - lastTimestamp) / 1000 // seconds elapsed
    lastTimestamp = timestamp

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth * dpr
    const h = canvas.clientHeight * dpr
    canvas.width = w
    canvas.height = h
    ctx.scale(dpr, dpr)

    const displayW = canvas.clientWidth
    const displayH = canvas.clientHeight

    // Pixels per mm based on 10-second sweep across full width
    const totalMm = PAPER_SPEED * 10 // 250mm for 10 seconds
    const pxPerMm = displayW / totalMm
    const mVtoPx = AMPLITUDE_SCALE * pxPerMm
    const baselineY = displayH / 2

    // How many samples to consume this frame
    const samplesPerSecond = SAMPLING_RATE
    const samplesToConsume = Math.round(samplesPerSecond * dt)

    // Get new samples from feed
    const newSamples = getSamples()
    sampleAccumulator.push(...newSamples)

    // Consume from accumulator
    const consuming = Math.min(samplesToConsume, sampleAccumulator.length)
    const consumed = sampleAccumulator.splice(0, consuming)
    displayBuffer.push(...consumed)

    // Pixels per sample
    const pxPerSample = (PAPER_SPEED * pxPerMm) / SAMPLING_RATE

    // Cap display buffer to fit canvas width
    const maxSamples = Math.ceil(displayW / pxPerSample)
    if (displayBuffer.length > maxSamples) {
      displayBuffer = displayBuffer.slice(displayBuffer.length - maxSamples)
    }

    // Clear and draw background
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, displayW, displayH)

    // Draw grid
    drawGrid(ctx, displayW, displayH, pxPerMm)

    // Sweep position
    sweepX = (displayBuffer.length * pxPerSample) % displayW

    // Draw trace
    if (displayBuffer.length > 1) {
      ctx.strokeStyle = TRACE_COLOR
      ctx.lineWidth = 1.5
      ctx.beginPath()

      for (let i = 0; i < displayBuffer.length; i++) {
        const x = (i * pxPerSample) % displayW
        const y = baselineY - displayBuffer[i]! * mVtoPx

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          const prevX = ((i - 1) * pxPerSample) % displayW
          // Don't draw line across wrap
          if (x < prevX) {
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
      }
      ctx.stroke()
    }

    // Draw sweep line
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(sweepX, 0)
    ctx.lineTo(sweepX, displayH)
    ctx.stroke()

    // Blank region ahead of sweep
    const blankStart = sweepX
    const blankEnd = Math.min(sweepX + SWEEP_BLANK_WIDTH, displayW)
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(blankStart, 0, blankEnd - blankStart, displayH)

    if (isRunning.value) {
      animationId = requestAnimationFrame(render)
    }
  }

  function start() {
    if (isRunning.value) return
    isRunning.value = true
    lastTimestamp = 0
    animationId = requestAnimationFrame(render)
  }

  function stop() {
    isRunning.value = false
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  function reset() {
    stop()
    sweepX = 0
    displayBuffer = []
    sampleAccumulator = []
    lastTimestamp = 0
  }

  return { isRunning, sweepX: ref(sweepX), start, stop, reset }
}
```

**Step 2: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/composables/useMonitorSweep.ts
git commit -m "feat(monitor): add sweep-line canvas composable with requestAnimationFrame"
```

---

### Task 7: Route & Project Registration

**Files:**
- Modify: `src/config/projects.ts`
- Modify: `src/router/index.ts`

**Step 1: Add project registry entry**

In `src/config/projects.ts`, add after the `urban-change` entry:

```typescript
  {
    id: 'ecg-monitor',
    title: 'Lead II ECG Monitor',
    description:
      'Live Lead II monitoring station with technician review, flagging, and simulated client notifications.',
    tags: ['Lead II', 'Real-Time', 'AI Interpretation', 'Canvas'],
    icon: 'HeartPulse',
    route: '/ecg-monitor',
  },
```

**Step 2: Add route**

In `src/router/index.ts`, add before the catch-all route:

```typescript
    {
      path: '/ecg-monitor',
      name: 'ecg-monitor',
      component: () => import('@/views/EcgMonitorApp.vue'),
    },
```

**Step 3: Create a minimal stub view** so the build works:

Create `src/views/EcgMonitorApp.vue`:

```vue
<script setup lang="ts">
</script>

<template>
  <div class="app-shell">
    <main class="app-main">
      <div class="app-container">
        <p>Lead II ECG Monitor — coming soon</p>
      </div>
    </main>
  </div>
</template>
```

**Step 4: Verify build**

Run: `npm run type-check && npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/config/projects.ts src/router/index.ts src/views/EcgMonitorApp.vue
git commit -m "feat(monitor): register Lead II ECG Monitor route and project card"
```

---

### Task 8: CSS Classes

**Files:**
- Modify: `src/assets/main.css`

**Step 1: Add all `.monitor-*` classes**

Add at the end of the file (before any final comments). These follow the existing `.ecg-*` naming pattern but use green accent (`#22c55e`) instead of cyan.

The CSS for this task is large. Add classes for:

- `.monitor-shell` — Full-screen flex layout
- `.monitor-header` — Top bar with patient ID, disclaimer, back button
- `.monitor-body` — Two-column layout (canvas left 60%, panel right 40%)
- `.monitor-canvas-wrap` — Canvas container with dark background
- `.monitor-hr-overlay` — Top-right HR + rhythm overlay on canvas
- `.monitor-panel` — Right side scrollable panel
- `.monitor-findings-section` — Section wrapper for findings
- `.monitor-section-label` — "System Interpretation — Review Required" label
- `.monitor-actions` — Button group for Confirm/Flag/Override/Next
- `.monitor-btn-confirm` — Green confirm button
- `.monitor-btn-flag` — Red flag button
- `.monitor-btn-override` — Secondary override button
- `.monitor-btn-next` — Next patient button
- `.monitor-flag-form` — Urgency selector + note + send button
- `.monitor-urgency-selector` — Toggle group for Routine/Urgent/Critical
- `.monitor-urgency-option` — Individual urgency button
- `.monitor-urgency-option.is-routine` / `.is-urgent` / `.is-critical` — Color variants
- `.monitor-note-input` — Textarea for technician note
- `.monitor-toast` — Toast notification (positioned fixed top-right)
- `.monitor-toast.is-routine` / `.is-urgent` / `.is-critical` — Border colors
- `.monitor-toast-enter` / `.monitor-toast-leave` — Transition classes
- `.monitor-notification-bar` — Collapsible bottom bar
- `.monitor-notification-toggle` — Toggle button with badge
- `.monitor-notification-badge` — Count badge
- `.monitor-notification-list` — Scrollable log list
- `.monitor-notification-entry` — Single log entry row
- `.monitor-urgency-badge` — Inline urgency badge (green/amber/red)
- `.monitor-disclaimer` — Medical disclaimer banner
- `.monitor-status-badge` — Review status (pending/confirmed/flagged)
- `.monitor-ai-section` — Collapsible AI narrative wrapper
- `.monitor-ai-toggle` — Show/hide AI narrative button
- `.monitor-ai-content` — AI narrative text blocks

Use green accent (`#22c55e` primary, `#16a34a` darker) for the monitor theme. Use existing `--color-surface-*` variables for backgrounds. Follow the exact same patterns as the `.ecg-*` classes (same border-radius, padding scale, font sizes).

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/assets/main.css
git commit -m "feat(monitor): add CSS classes for Lead II monitor UI"
```

---

### Task 9: MonitorSweepCanvas Component

**Files:**
- Create: `src/components/ecg-monitor/MonitorSweepCanvas.vue`

**Step 1: Create the component**

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useMonitorSweep } from '@/composables/useMonitorSweep'
import { useMonitorFeed } from '@/composables/useMonitorFeed'
import { useMonitorAnalysis } from '@/composables/useMonitorAnalysis'
import { useEcgMonitorStore } from '@/stores/ecg-monitor'
import { SAMPLING_RATE } from '@/config/monitor-patients'

const store = useEcgMonitorStore()
const feed = useMonitorFeed()
const { runAnalysis } = useMonitorAnalysis()

const canvasRef = ref<HTMLCanvasElement | null>(null)

// Feed samples to sweep at a steady rate
const FEED_INTERVAL = 50 // ms
const SAMPLES_PER_TICK = Math.round(SAMPLING_RATE * (FEED_INTERVAL / 1000)) // 25 samples

let feedTimer: ReturnType<typeof setInterval> | null = null

function tickFeed(): number[] {
  return feed.consumeSamples(SAMPLES_PER_TICK)
}

const { start, stop, reset: resetSweep } = useMonitorSweep(canvasRef, tickFeed)

// Watch for completed segments
watch(() => feed.segmentReady.value, (ready) => {
  if (ready && feed.lastSegment.value.length > 0) {
    runAnalysis(feed.lastSegment.value)
    feed.acknowledgeSegment()
  }
})

// Sync patient from store to feed
watch(() => store.currentPatient, (patient) => {
  if (patient) {
    const index = feed.currentPatientIndex.value
    feed.switchPatient(index)
    resetSweep()
    start()
  }
})

onMounted(() => {
  if (store.currentPatient) {
    start()
  }
})

onBeforeUnmount(() => {
  stop()
  if (feedTimer) clearInterval(feedTimer)
})

defineExpose({ feed, resetSweep, start, stop })
</script>

<template>
  <div class="monitor-canvas-wrap">
    <canvas ref="canvasRef" class="monitor-canvas" />
    <div class="monitor-hr-overlay">
      <span class="monitor-hr-value">{{ store.displayHeartRate ?? '--' }}</span>
      <span class="monitor-hr-unit">BPM</span>
      <span class="monitor-hr-rhythm">{{ store.displayRhythm }}</span>
    </div>
  </div>
</template>
```

**Step 2: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/ecg-monitor/MonitorSweepCanvas.vue
git commit -m "feat(monitor): add sweep-line canvas component with live feed"
```

---

### Task 10: MonitorFindings Component

**Files:**
- Create: `src/components/ecg-monitor/MonitorFindings.vue`

**Step 1: Create the component**

Displays metrics cards, abnormality flags, and collapsible AI narrative. Reuses the same metric card styling pattern as the existing ECG analyzer.

The component should:
- Show metric cards for HR, Rhythm, PR, QRS, QTc, RR CV
- Show abnormality badges with severity colors
- Show collapsible AI narrative (7 sections) with a toggle button
- Show "System Interpretation — Review Required" label when status is pending
- Show "Confirmed" / "Flagged" / "Overridden" status badge when reviewed
- Show loading spinner when AI is generating
- Handle AI errors gracefully

Uses `store.analysisResult`, `store.aiInterpretation`, `store.aiState`, `store.reviewStatus` from the Pinia store.

**Step 2: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/ecg-monitor/MonitorFindings.vue
git commit -m "feat(monitor): add findings panel with metrics, flags, and AI narrative"
```

---

### Task 11: MonitorActions Component

**Files:**
- Create: `src/components/ecg-monitor/MonitorActions.vue`

**Step 1: Create the component**

The technician action panel with:
- **Confirm** button (green) — calls `store.confirmReading()`
- **Flag** button (red) — toggles open a flag form
- **Override** button (secondary) — toggles open an override form
- **Next Patient** button — emits `next-patient` event

Flag form contains:
- Urgency selector (3 radio-style buttons: Routine / Urgent / Critical)
- Free text note input
- "Send Notification" button — calls `store.sendNotification(urgency, note)`

Override form contains:
- Text input for rhythm override
- Text input for correction note
- "Save Override" button — calls `store.overrideFindings(rhythm, note)`

All buttons disabled when `store.analysisState !== 'complete'` (no results to review yet).

**Step 2: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/ecg-monitor/MonitorActions.vue
git commit -m "feat(monitor): add technician action buttons with flag and override forms"
```

---

### Task 12: MonitorToast & MonitorNotificationLog Components

**Files:**
- Create: `src/components/ecg-monitor/MonitorToast.vue`
- Create: `src/components/ecg-monitor/MonitorNotificationLog.vue`

**Step 1: Create MonitorToast**

Fixed-position toast that appears when `store.activeToast` is non-null. Auto-dismisses after 5 seconds via `setTimeout`. Color-coded border by urgency (green/amber/red). Shows: "Alert sent for [Patient ID] — [Urgency]: [Finding]".

**Step 2: Create MonitorNotificationLog**

Collapsible bottom bar. Toggle button shows "Notifications (N)" with count badge. Expanded state shows a scrollable list of `store.notifications` with timestamp, patient ID, urgency badge, finding, and technician note.

**Step 3: Verify build**

Run: `npm run type-check`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/ecg-monitor/MonitorToast.vue src/components/ecg-monitor/MonitorNotificationLog.vue
git commit -m "feat(monitor): add toast notification and notification log components"
```

---

### Task 13: EcgMonitorApp Main Shell

**Files:**
- Modify: `src/views/EcgMonitorApp.vue` (replace the stub from Task 7)

**Step 1: Build the full app shell**

Replace the stub with the complete app shell that:

- Imports and uses all monitor components
- Sets up the initial patient on mount (first patient in pool)
- Wires `nextPatient` handler to the feed composable + store
- Cleans up on route leave (`onBeforeRouteLeave` → `store.reset()`)
- Renders the layout:
  - Header with "Lead II Monitor", patient ID/condition, back button, disclaimer
  - Two-column body: canvas (left ~60%) + panel (right ~40%)
  - Panel contains: MonitorFindings + MonitorActions
  - MonitorToast (fixed position)
  - MonitorNotificationLog (bottom bar)

The header should include the `HeartPulse` icon from lucide-vue-next and a router-link back to `/`.

**Step 2: Verify build**

Run: `npm run type-check && npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/views/EcgMonitorApp.vue
git commit -m "feat(monitor): build main app shell wiring all monitor components"
```

---

### Task 14: Final Build & Manual Verification

**Step 1: Full production build**

Run: `npm run type-check && npm run build`
Expected: PASS with no errors

**Step 2: Start dev server**

Run: `npm run dev`

**Step 3: Manual verification checklist**

1. Portfolio gallery at `/` shows the "Lead II ECG Monitor" card with HeartPulse icon
2. Clicking the card navigates to `/ecg-monitor`
3. The monitor loads with Patient P-001 and the sweep line animates
4. Green waveform traces across the canvas left-to-right with sweep line
5. After ~10 seconds, the first analysis completes — HR and rhythm update on canvas overlay
6. Right panel shows metrics cards, abnormality flags
7. AI narrative loads (may take a few seconds) and is collapsible
8. "System Interpretation — Review Required" label visible
9. Click "Confirm" → status changes to "Confirmed"
10. Click "Next Patient" → sweep resets, new patient loads
11. On a patient with abnormalities (e.g., P-006 STEMI), click "Flag as Concerning"
12. Select urgency, add a note, click "Send Notification"
13. Toast appears with correct patient/urgency/finding, auto-dismisses after 5s
14. Notification log at bottom shows the alert
15. "Override Findings" lets you edit rhythm label and add a note
16. Medical disclaimer is always visible in header
17. Back button returns to portfolio gallery
18. Monitor state resets on navigation away

**Step 4: Fix any issues found, then final build**

Run: `npm run build`
Expected: PASS
