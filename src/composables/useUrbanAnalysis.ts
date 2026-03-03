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
      store.setAnalysisState('fetching-old')
      const dataA = await fetchOverpassData(store.selectedBounds, store.yearA, store.focusFilter)

      store.setAnalysisState('fetching-new')
      const dataB = await fetchOverpassData(store.selectedBounds, store.yearB, store.focusFilter)

      store.setAnalysisState('diffing')
      const summary = computeChangeSummary(
        dataA.buildings,
        dataB.buildings,
        dataA.landUse,
        dataB.landUse,
      )
      store.setChangeSummary(summary)

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
