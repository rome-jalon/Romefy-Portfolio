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
