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
