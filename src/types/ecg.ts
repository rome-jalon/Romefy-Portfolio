export const ECG_LEAD_NAMES = [
  'I', 'II', 'III', 'aVR', 'aVL', 'aVF',
  'V1', 'V2', 'V3', 'V4', 'V5', 'V6',
] as const

export type EcgLeadName = (typeof ECG_LEAD_NAMES)[number]

export interface EcgMetadata {
  patientId?: string
  recordingDate?: string
  device?: string
}

export interface EcgData {
  metadata?: EcgMetadata
  samplingRate: number
  duration: number
  leads: Record<EcgLeadName, number[]>
}

export interface RPeakResult {
  indices: number[]
  amplitudes: number[]
}

export interface RRIntervalStats {
  intervals: number[]
  mean: number
  stdDev: number
  cv: number
}

export interface IntervalMeasurements {
  pr: number | null
  qrs: number | null
  qt: number | null
  qtc: number | null
}

export interface LeadAnalysis {
  leadName: EcgLeadName
  filteredSignal: number[]
  rPeaks: RPeakResult
  rrStats: RRIntervalStats | null
  heartRate: number | null
  intervals: IntervalMeasurements
}

export type AbnormalitySeverity = 'normal' | 'warning' | 'critical'

export interface AbnormalityFlag {
  name: string
  description: string
  severity: AbnormalitySeverity
  value: number | string
  normalRange: string
}

export interface EcgAnalysisResult {
  leadAnalyses: LeadAnalysis[]
  aggregateHeartRate: number
  aggregateRhythm: string
  aggregateRRStats: RRIntervalStats
  aggregateIntervals: IntervalMeasurements
  abnormalities: AbnormalityFlag[]
}

export interface EcgAiInterpretation {
  summary: string
  rhythmAnalysis: string
  rateAssessment: string
  intervalAnalysis: string
  axisEstimation: string
  abnormalityAssessment: string
  clinicalCorrelation: string
}

export type EcgAnalyzerStage = 1 | 2 | 3

export type EcgAnalysisState = 'idle' | 'analyzing' | 'error' | 'complete'

export type EcgAiState = 'idle' | 'loading' | 'error' | 'complete'

export interface EcgCanvasConfig {
  showGrid: boolean
  showRPeaks: boolean
}

export const STANDARD_3x4_LAYOUT: [EcgLeadName, EcgLeadName, EcgLeadName, EcgLeadName][] = [
  ['I', 'aVR', 'V1', 'V4'],
  ['II', 'aVL', 'V2', 'V5'],
  ['III', 'aVF', 'V3', 'V6'],
]

export const RHYTHM_STRIP_LEAD: EcgLeadName = 'II'

export interface SampleDataset {
  id: string
  name: string
  description: string
  fileName: string
  heartRate: string
  condition: string
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'normal-sinus',
    name: 'Normal Sinus Rhythm',
    description: 'Regular rhythm at ~72 bpm with normal intervals',
    fileName: 'normal-sinus-rhythm.json',
    heartRate: '~72 bpm',
    condition: 'Normal',
  },
  {
    id: 'bradycardia',
    name: 'Sinus Bradycardia',
    description: 'Slow regular rhythm at ~48 bpm',
    fileName: 'sinus-bradycardia.json',
    heartRate: '~48 bpm',
    condition: 'Bradycardia',
  },
  {
    id: 'tachycardia',
    name: 'Sinus Tachycardia',
    description: 'Fast regular rhythm at ~115 bpm',
    fileName: 'sinus-tachycardia.json',
    heartRate: '~115 bpm',
    condition: 'Tachycardia',
  },
  {
    id: 'irregular',
    name: 'Irregular Rhythm',
    description: 'Variable RR intervals at ~75 bpm',
    fileName: 'irregular-rhythm.json',
    heartRate: '~75 bpm',
    condition: 'Irregular',
  },
  {
    id: 'prolonged-qt',
    name: 'Prolonged QT',
    description: 'Long QT syndrome with QTc ~520ms at ~65 bpm',
    fileName: 'prolonged-qt.json',
    heartRate: '~65 bpm',
    condition: 'Long QT',
  },
  {
    id: 'first-degree-av-block',
    name: 'First Degree AV Block',
    description: 'Prolonged PR interval (~240ms) at ~68 bpm',
    fileName: 'first-degree-av-block.json',
    heartRate: '~68 bpm',
    condition: 'AV Block',
  },
  {
    id: 'wide-qrs',
    name: 'Wide QRS Complex',
    description: 'Bundle branch block pattern with QRS ~145ms at ~80 bpm',
    fileName: 'wide-qrs-complex.json',
    heartRate: '~80 bpm',
    condition: 'Wide QRS',
  },
  {
    id: 'atrial-fibrillation',
    name: 'Atrial Fibrillation',
    description: 'Very irregular rhythm with absent P waves at ~85 bpm',
    fileName: 'atrial-fibrillation.json',
    heartRate: '~85 bpm',
    condition: 'AFib',
  },
  {
    id: 'lvh',
    name: 'Left Ventricular Hypertrophy',
    description: 'Tall R waves and deep S waves at ~70 bpm',
    fileName: 'left-ventricular-hypertrophy.json',
    heartRate: '~70 bpm',
    condition: 'LVH',
  },
  {
    id: 'st-elevation',
    name: 'ST Elevation',
    description: 'ST elevation with deep Q waves at ~80 bpm',
    fileName: 'st-elevation.json',
    heartRate: '~80 bpm',
    condition: 'STEMI',
  },
]

export const ECG_NORMAL_RANGES = {
  heartRate: { min: 60, max: 100, warningLow: 50, warningHigh: 110, unit: 'bpm' },
  pr: { min: 120, max: 200, warningMax: 220, unit: 'ms' },
  qrs: { min: 60, max: 120, warningMax: 140, unit: 'ms' },
  qtc: { min: 350, max: 440, warningMax: 500, unit: 'ms' },
  rrCV: { max: 10, warningMax: 20, unit: '%' },
} as const
