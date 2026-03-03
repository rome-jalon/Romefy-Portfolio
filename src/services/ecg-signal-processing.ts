import type {
  EcgData,
  EcgLeadName,
  RPeakResult,
  RRIntervalStats,
  IntervalMeasurements,
  LeadAnalysis,
  AbnormalityFlag,
  EcgAnalysisResult,
} from '@/types/ecg'
import { ECG_LEAD_NAMES, ECG_NORMAL_RANGES } from '@/types/ecg'

/**
 * 2nd-order Butterworth IIR biquad bandpass filter (0.5–40 Hz).
 * Cascades a high-pass (0.5 Hz) and low-pass (40 Hz) biquad section.
 */
export function bandpassFilter(signal: number[], samplingRate: number): number[] {
  const highpassed = biquadFilter(signal, computeHighpassCoeffs(0.5, samplingRate))
  return biquadFilter(highpassed, computeLowpassCoeffs(40, samplingRate))
}

interface BiquadCoeffs {
  b0: number; b1: number; b2: number
  a1: number; a2: number
}

function computeHighpassCoeffs(fc: number, fs: number): BiquadCoeffs {
  const w0 = (2 * Math.PI * fc) / fs
  const alpha = Math.sin(w0) / (2 * (1 / Math.SQRT2))
  const cosW0 = Math.cos(w0)
  const a0 = 1 + alpha
  return {
    b0: ((1 + cosW0) / 2) / a0,
    b1: (-(1 + cosW0)) / a0,
    b2: ((1 + cosW0) / 2) / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha) / a0,
  }
}

function computeLowpassCoeffs(fc: number, fs: number): BiquadCoeffs {
  const w0 = (2 * Math.PI * fc) / fs
  const alpha = Math.sin(w0) / (2 * (1 / Math.SQRT2))
  const cosW0 = Math.cos(w0)
  const a0 = 1 + alpha
  return {
    b0: ((1 - cosW0) / 2) / a0,
    b1: (1 - cosW0) / a0,
    b2: ((1 - cosW0) / 2) / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha) / a0,
  }
}

function biquadFilter(signal: number[], c: BiquadCoeffs): number[] {
  const out = new Array<number>(signal.length)
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let i = 0; i < signal.length; i++) {
    const x0 = signal[i]!
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2
    out[i] = y0
    x2 = x1; x1 = x0
    y2 = y1; y1 = y0
  }
  return out
}

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

/**
 * Pan-Tompkins R-peak detection algorithm.
 * Steps: differentiate -> square -> moving-window integrate -> adaptive threshold
 */
export function detectRPeaks(signal: number[], samplingRate: number): RPeakResult {
  const len = signal.length
  if (len < 4) return { indices: [], amplitudes: [] }

  // 1. Differentiate (5-point derivative)
  const diff = new Array<number>(len).fill(0)
  for (let i = 2; i < len - 2; i++) {
    diff[i] = (-signal[i - 2]! - 2 * signal[i - 1]! + 2 * signal[i + 1]! + signal[i + 2]!) / 8
  }

  // 2. Square
  const squared = diff.map((v) => v * v)

  // 3. Moving window integration (150ms window)
  const windowSize = Math.round(0.15 * samplingRate)
  const integrated = new Array<number>(len).fill(0)
  let runningSum = 0
  for (let i = 0; i < len; i++) {
    runningSum += squared[i]!
    if (i >= windowSize) {
      runningSum -= squared[i - windowSize]!
    }
    integrated[i] = runningSum / Math.min(i + 1, windowSize)
  }

  // 4. Adaptive threshold with refractory period
  const refractorySamples = Math.round(0.2 * samplingRate)
  let signalPeak = 0
  let noisePeak = 0
  const indices: number[] = []
  const amplitudes: number[] = []

  // Initialize thresholds from first second
  const initEnd = Math.min(samplingRate, len)
  for (let i = 0; i < initEnd; i++) {
    if (integrated[i]! > signalPeak) signalPeak = integrated[i]!
  }
  noisePeak = signalPeak * 0.3

  let lastPeakIdx = -refractorySamples

  for (let i = 1; i < len - 1; i++) {
    const val = integrated[i]!
    // Local maximum check
    if (val > integrated[i - 1]! && val >= integrated[i + 1]!) {
      const threshold = noisePeak + 0.25 * (signalPeak - noisePeak)
      if (val > threshold && (i - lastPeakIdx) > refractorySamples) {
        // Find the actual R-peak in original signal near this index
        const searchStart = Math.max(0, i - Math.round(0.075 * samplingRate))
        const searchEnd = Math.min(len - 1, i + Math.round(0.075 * samplingRate))
        let maxIdx = searchStart
        let maxVal = signal[searchStart]!
        for (let j = searchStart + 1; j <= searchEnd; j++) {
          if (signal[j]! > maxVal) {
            maxVal = signal[j]!
            maxIdx = j
          }
        }
        indices.push(maxIdx)
        amplitudes.push(maxVal)
        signalPeak = 0.875 * signalPeak + 0.125 * val
        lastPeakIdx = i
      } else {
        noisePeak = 0.875 * noisePeak + 0.125 * val
      }
    }
  }

  return { indices, amplitudes }
}

export function analyzeRRIntervals(rPeaks: RPeakResult, samplingRate: number): RRIntervalStats | null {
  if (rPeaks.indices.length < 2) return null

  const intervals: number[] = []
  for (let i = 1; i < rPeaks.indices.length; i++) {
    const rrMs = ((rPeaks.indices[i]! - rPeaks.indices[i - 1]!) / samplingRate) * 1000
    intervals.push(rrMs)
  }

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const variance = intervals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / intervals.length
  const stdDev = Math.sqrt(variance)
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0

  return { intervals, mean, stdDev, cv }
}

export function calculateHeartRate(rrStats: RRIntervalStats | null): number | null {
  if (!rrStats || rrStats.mean <= 0) return null
  return 60000 / rrStats.mean
}

export function measureIntervals(
  signal: number[],
  rPeaks: RPeakResult,
  samplingRate: number,
): IntervalMeasurements {
  if (rPeaks.indices.length < 2) {
    return { pr: null, qrs: null, qt: null, qtc: null }
  }

  const prValues: number[] = []
  const qrsValues: number[] = []
  const qtValues: number[] = []

  for (const rIdx of rPeaks.indices) {
    // PR interval: search backward from R for P-wave onset
    const prSearch = Math.round(0.3 * samplingRate)
    const prStart = Math.max(0, rIdx - prSearch)
    // Find the minimum before R (Q wave), then search further back for P onset
    let qIdx = rIdx
    for (let j = rIdx - 1; j >= Math.max(0, rIdx - Math.round(0.08 * samplingRate)); j--) {
      if (signal[j]! < signal[qIdx]!) qIdx = j
    }

    // Search backward from Q for P wave peak
    let pPeak = qIdx
    for (let j = qIdx - 1; j >= prStart; j--) {
      if (signal[j]! > signal[pPeak]!) pPeak = j
    }

    // P onset: find where signal drops to baseline before P peak
    let pOnset = pPeak
    const baselineThreshold = signal[pPeak]! * 0.3
    for (let j = pPeak - 1; j >= prStart; j--) {
      if (signal[j]! <= baselineThreshold) {
        pOnset = j
        break
      }
    }

    if (pOnset !== pPeak) {
      prValues.push(((rIdx - pOnset) / samplingRate) * 1000)
    }

    // QRS duration: width at half-amplitude
    const rAmp = signal[rIdx]!
    const halfAmp = rAmp * 0.5
    let qrsStart = rIdx
    let qrsEnd = rIdx
    for (let j = rIdx - 1; j >= Math.max(0, rIdx - Math.round(0.1 * samplingRate)); j--) {
      if (signal[j]! < halfAmp) { qrsStart = j; break }
    }
    for (let j = rIdx + 1; j <= Math.min(signal.length - 1, rIdx + Math.round(0.1 * samplingRate)); j++) {
      if (signal[j]! < halfAmp) { qrsEnd = j; break }
    }
    if (qrsStart !== qrsEnd) {
      qrsValues.push(((qrsEnd - qrsStart) / samplingRate) * 1000)
    }

    // QT interval: Q onset to T wave end
    const qtSearch = Math.round(0.6 * samplingRate)
    const qtEnd = Math.min(signal.length - 1, rIdx + qtSearch)
    // Find T wave peak after ST segment
    const tSearchStart = rIdx + Math.round(0.15 * samplingRate)
    let tPeak = tSearchStart
    for (let j = tSearchStart; j <= Math.min(qtEnd, rIdx + Math.round(0.45 * samplingRate)); j++) {
      if (j < signal.length && signal[j]! > signal[tPeak]!) tPeak = j
    }
    // T end: where signal returns to baseline after T peak
    let tEnd = tPeak
    const tBaseline = Math.abs(signal[tPeak]!) * 0.15
    for (let j = tPeak + 1; j <= qtEnd && j < signal.length; j++) {
      if (Math.abs(signal[j]!) <= tBaseline) { tEnd = j; break }
    }
    if (tEnd > qIdx) {
      qtValues.push(((tEnd - qIdx) / samplingRate) * 1000)
    }
  }

  const pr = prValues.length > 0 ? prValues.reduce((a, b) => a + b, 0) / prValues.length : null
  const qrs = qrsValues.length > 0 ? qrsValues.reduce((a, b) => a + b, 0) / qrsValues.length : null
  const qt = qtValues.length > 0 ? qtValues.reduce((a, b) => a + b, 0) / qtValues.length : null

  // QTc via Bazett's formula: QTc = QT / sqrt(RR in seconds)
  let qtc: number | null = null
  if (qt !== null && rPeaks.indices.length >= 2) {
    const rrIntervals: number[] = []
    for (let i = 1; i < rPeaks.indices.length; i++) {
      rrIntervals.push((rPeaks.indices[i]! - rPeaks.indices[i - 1]!) / samplingRate)
    }
    const meanRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length
    if (meanRR > 0) {
      qtc = qt / Math.sqrt(meanRR)
    }
  }

  return { pr, qrs, qt, qtc }
}

export function assessRhythmRegularity(rrStats: RRIntervalStats | null): string {
  if (!rrStats) return 'Indeterminate'
  if (rrStats.cv < 10) return 'Regular'
  if (rrStats.cv < 20) return 'Mildly Irregular'
  return 'Irregular'
}

export function detectAbnormalities(
  heartRate: number | null,
  intervals: IntervalMeasurements,
  rrStats: RRIntervalStats | null,
): AbnormalityFlag[] {
  const flags: AbnormalityFlag[] = []
  const ranges = ECG_NORMAL_RANGES

  if (heartRate !== null) {
    if (heartRate < ranges.heartRate.warningLow) {
      flags.push({
        name: 'Severe Bradycardia',
        description: `Heart rate of ${Math.round(heartRate)} bpm is critically low`,
        severity: 'critical',
        value: Math.round(heartRate),
        normalRange: `${ranges.heartRate.min}–${ranges.heartRate.max} bpm`,
      })
    } else if (heartRate < ranges.heartRate.min) {
      flags.push({
        name: 'Bradycardia',
        description: `Heart rate of ${Math.round(heartRate)} bpm is below normal`,
        severity: 'warning',
        value: Math.round(heartRate),
        normalRange: `${ranges.heartRate.min}–${ranges.heartRate.max} bpm`,
      })
    } else if (heartRate > ranges.heartRate.warningHigh) {
      flags.push({
        name: 'Significant Tachycardia',
        description: `Heart rate of ${Math.round(heartRate)} bpm is significantly elevated`,
        severity: 'critical',
        value: Math.round(heartRate),
        normalRange: `${ranges.heartRate.min}–${ranges.heartRate.max} bpm`,
      })
    } else if (heartRate > ranges.heartRate.max) {
      flags.push({
        name: 'Tachycardia',
        description: `Heart rate of ${Math.round(heartRate)} bpm is above normal`,
        severity: 'warning',
        value: Math.round(heartRate),
        normalRange: `${ranges.heartRate.min}–${ranges.heartRate.max} bpm`,
      })
    }
  }

  if (intervals.pr !== null) {
    if (intervals.pr > ranges.pr.warningMax) {
      flags.push({
        name: 'Prolonged PR',
        description: `PR interval of ${Math.round(intervals.pr)} ms suggests first-degree AV block`,
        severity: 'critical',
        value: Math.round(intervals.pr),
        normalRange: `${ranges.pr.min}–${ranges.pr.max} ms`,
      })
    } else if (intervals.pr > ranges.pr.max) {
      flags.push({
        name: 'Borderline Prolonged PR',
        description: `PR interval of ${Math.round(intervals.pr)} ms is borderline prolonged`,
        severity: 'warning',
        value: Math.round(intervals.pr),
        normalRange: `${ranges.pr.min}–${ranges.pr.max} ms`,
      })
    } else if (intervals.pr < ranges.pr.min) {
      flags.push({
        name: 'Short PR',
        description: `PR interval of ${Math.round(intervals.pr)} ms may suggest pre-excitation`,
        severity: 'warning',
        value: Math.round(intervals.pr),
        normalRange: `${ranges.pr.min}–${ranges.pr.max} ms`,
      })
    }
  }

  if (intervals.qrs !== null) {
    if (intervals.qrs > ranges.qrs.warningMax) {
      flags.push({
        name: 'Wide QRS',
        description: `QRS duration of ${Math.round(intervals.qrs)} ms suggests conduction delay`,
        severity: 'critical',
        value: Math.round(intervals.qrs),
        normalRange: `${ranges.qrs.min}–${ranges.qrs.max} ms`,
      })
    } else if (intervals.qrs > ranges.qrs.max) {
      flags.push({
        name: 'Borderline Wide QRS',
        description: `QRS duration of ${Math.round(intervals.qrs)} ms is borderline prolonged`,
        severity: 'warning',
        value: Math.round(intervals.qrs),
        normalRange: `${ranges.qrs.min}–${ranges.qrs.max} ms`,
      })
    }
  }

  if (intervals.qtc !== null) {
    if (intervals.qtc > ranges.qtc.warningMax) {
      flags.push({
        name: 'Prolonged QTc',
        description: `QTc of ${Math.round(intervals.qtc)} ms significantly increases arrhythmia risk`,
        severity: 'critical',
        value: Math.round(intervals.qtc),
        normalRange: `${ranges.qtc.min}–${ranges.qtc.max} ms`,
      })
    } else if (intervals.qtc > ranges.qtc.max) {
      flags.push({
        name: 'Borderline Prolonged QTc',
        description: `QTc of ${Math.round(intervals.qtc)} ms is borderline prolonged`,
        severity: 'warning',
        value: Math.round(intervals.qtc),
        normalRange: `${ranges.qtc.min}–${ranges.qtc.max} ms`,
      })
    } else if (intervals.qtc < ranges.qtc.min) {
      flags.push({
        name: 'Short QTc',
        description: `QTc of ${Math.round(intervals.qtc)} ms is abnormally short`,
        severity: 'warning',
        value: Math.round(intervals.qtc),
        normalRange: `${ranges.qtc.min}–${ranges.qtc.max} ms`,
      })
    }
  }

  if (rrStats && rrStats.cv > ECG_NORMAL_RANGES.rrCV.warningMax) {
    flags.push({
      name: 'Irregular Rhythm',
      description: `RR interval variability (CV ${rrStats.cv.toFixed(1)}%) indicates irregular rhythm`,
      severity: 'critical',
      value: `${rrStats.cv.toFixed(1)}%`,
      normalRange: `< ${ranges.rrCV.max}%`,
    })
  } else if (rrStats && rrStats.cv > ECG_NORMAL_RANGES.rrCV.max) {
    flags.push({
      name: 'Mildly Irregular Rhythm',
      description: `RR interval variability (CV ${rrStats.cv.toFixed(1)}%) suggests mild irregularity`,
      severity: 'warning',
      value: `${rrStats.cv.toFixed(1)}%`,
      normalRange: `< ${ranges.rrCV.max}%`,
    })
  }

  return flags
}

function analyzeSingleLead(
  leadName: EcgLeadName,
  rawSignal: number[],
  samplingRate: number,
): LeadAnalysis {
  const filteredSignal = bandpassFilter(rawSignal, samplingRate)
  const rPeaks = detectRPeaks(filteredSignal, samplingRate)
  const rrStats = analyzeRRIntervals(rPeaks, samplingRate)
  const heartRate = calculateHeartRate(rrStats)
  const intervals = measureIntervals(filteredSignal, rPeaks, samplingRate)

  return { leadName, filteredSignal, rPeaks, rrStats, heartRate, intervals }
}

/**
 * Full ECG analysis orchestrator. Processes all 12 leads with progress callbacks
 * and setTimeout(0) yields between leads for UI responsiveness.
 */
export async function analyzeFullEcg(
  ecgData: EcgData,
  onProgress?: (leadIndex: number, total: number) => void,
): Promise<EcgAnalysisResult> {
  const leadAnalyses: LeadAnalysis[] = []

  for (let i = 0; i < ECG_LEAD_NAMES.length; i++) {
    const leadName = ECG_LEAD_NAMES[i]!
    const rawSignal = ecgData.leads[leadName]
    const analysis = analyzeSingleLead(leadName, rawSignal, ecgData.samplingRate)
    leadAnalyses.push(analysis)
    onProgress?.(i + 1, ECG_LEAD_NAMES.length)
    // Yield to event loop for UI updates
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  // Aggregate from Lead II (standard monitoring lead) or first available
  const primaryLead = leadAnalyses.find((a) => a.leadName === 'II') ?? leadAnalyses[0]!
  const aggregateHeartRate = primaryLead.heartRate ?? 0
  const aggregateRRStats = primaryLead.rrStats ?? { intervals: [], mean: 0, stdDev: 0, cv: 0 }
  const aggregateRhythm = assessRhythmRegularity(primaryLead.rrStats)
  const aggregateIntervals = primaryLead.intervals

  const abnormalities = detectAbnormalities(aggregateHeartRate, aggregateIntervals, aggregateRRStats)

  return {
    leadAnalyses,
    aggregateHeartRate,
    aggregateRhythm,
    aggregateRRStats,
    aggregateIntervals,
    abnormalities,
  }
}
