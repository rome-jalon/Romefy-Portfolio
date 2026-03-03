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
