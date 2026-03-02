import { ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  EcgData,
  EcgAnalysisResult,
  EcgAiInterpretation,
  EcgAnalyzerStage,
  EcgAnalysisState,
  EcgAiState,
} from '@/types/ecg'

export const useEcgAnalyzerStore = defineStore('ecg-analyzer', () => {
  const currentStage = ref<EcgAnalyzerStage>(1)
  const ecgData = ref<EcgData | null>(null)
  const analysisResult = ref<EcgAnalysisResult | null>(null)
  const analysisState = ref<EcgAnalysisState>('idle')
  const analysisProgress = ref(0)
  const analysisError = ref<string | null>(null)
  const aiInterpretation = ref<EcgAiInterpretation | null>(null)
  const aiState = ref<EcgAiState>('idle')
  const aiError = ref<string | null>(null)

  function setEcgData(data: EcgData | null) {
    ecgData.value = data
    // Reset downstream state when new data is loaded
    analysisResult.value = null
    analysisState.value = 'idle'
    analysisProgress.value = 0
    analysisError.value = null
    aiInterpretation.value = null
    aiState.value = 'idle'
    aiError.value = null
  }

  function setAnalysisResult(result: EcgAnalysisResult) {
    analysisResult.value = result
    // Reset AI state so Stage 3 re-generates for new analysis
    aiInterpretation.value = null
    aiState.value = 'idle'
    aiError.value = null
  }

  function setAnalysisState(state: EcgAnalysisState) {
    analysisState.value = state
  }

  function setAnalysisProgress(progress: number) {
    analysisProgress.value = progress
  }

  function setAnalysisError(error: string | null) {
    analysisError.value = error
  }

  function setAiInterpretation(interpretation: EcgAiInterpretation) {
    aiInterpretation.value = interpretation
  }

  function setAiState(state: EcgAiState) {
    aiState.value = state
  }

  function setAiError(error: string | null) {
    aiError.value = error
  }

  function goToStage(stage: EcgAnalyzerStage) {
    currentStage.value = stage
  }

  function reset() {
    currentStage.value = 1
    ecgData.value = null
    analysisResult.value = null
    analysisState.value = 'idle'
    analysisProgress.value = 0
    analysisError.value = null
    aiInterpretation.value = null
    aiState.value = 'idle'
    aiError.value = null
  }

  return {
    currentStage,
    ecgData,
    analysisResult,
    analysisState,
    analysisProgress,
    analysisError,
    aiInterpretation,
    aiState,
    aiError,
    setEcgData,
    setAnalysisResult,
    setAnalysisState,
    setAnalysisProgress,
    setAnalysisError,
    setAiInterpretation,
    setAiState,
    setAiError,
    goToStage,
    reset,
  }
})
