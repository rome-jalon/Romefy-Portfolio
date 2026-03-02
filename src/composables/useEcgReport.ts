import { useEcgAnalyzerStore } from '@/stores/ecg-analyzer'
import { generateEcgInterpretation } from '@/services/ecg-ai-interpretation'

export function useEcgReport() {
  const store = useEcgAnalyzerStore()

  async function generateReport() {
    if (!store.analysisResult) return

    store.setAiState('loading')
    store.setAiError(null)

    try {
      const interpretation = await generateEcgInterpretation(store.analysisResult)
      store.setAiInterpretation(interpretation)
      store.setAiState('complete')
    } catch (error) {
      store.setAiError(
        error instanceof Error ? error.message : 'Failed to generate interpretation.',
      )
      store.setAiState('error')
    }
  }

  return { generateReport }
}
