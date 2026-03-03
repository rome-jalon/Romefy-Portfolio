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
