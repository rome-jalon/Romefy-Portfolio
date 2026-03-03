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
  const currentStage = ref<UrbanChangeStage>(1)
  const selectedLocation = ref<LocationInfo | null>(null)
  const selectedBounds = ref<BoundingBox | null>(null)
  const selectedAreaKm2 = ref(0)
  const yearA = ref(2015)
  const yearB = ref(2024)
  const focusFilter = ref<FocusFilter>('all')
  const analysisState = ref<AnalysisState>('idle')
  const analysisError = ref<string | null>(null)
  const changeSummary = ref<ChangeSummary | null>(null)
  const aiNarrative = ref<AiNarrative | null>(null)
  const aiState = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
  const aiError = ref<string | null>(null)

  function goToStage(stage: UrbanChangeStage) {
    currentStage.value = stage
  }

  function setLocation(location: LocationInfo | null) {
    selectedLocation.value = location
    selectedBounds.value = null
    selectedAreaKm2.value = 0
    clearResults()
  }

  function setBounds(bounds: BoundingBox | null, areaKm2: number) {
    selectedBounds.value = bounds
    selectedAreaKm2.value = areaKm2
    clearResults()
  }

  function setYears(a: number, b: number) {
    yearA.value = a
    yearB.value = b
    clearResults()
  }

  function setFocusFilter(filter: FocusFilter) {
    focusFilter.value = filter
    clearResults()
  }

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
    currentStage, selectedLocation, selectedBounds, selectedAreaKm2,
    yearA, yearB, focusFilter,
    analysisState, analysisError, changeSummary, aiNarrative, aiState, aiError,
    goToStage, setLocation, setBounds, setYears, setFocusFilter,
    setAnalysisState, setAnalysisError, setChangeSummary, setAiNarrative,
    setAiState, setAiError, clearResults, reset,
  }
})
