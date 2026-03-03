import type { MonitorPatientProfile } from '@/types/ecg-monitor'

export const MONITOR_PATIENTS: MonitorPatientProfile[] = [
  {
    id: 'P-001',
    name: 'Patient P-001',
    condition: 'Normal Sinus Rhythm',
    rrMs: 833,
    irregular: false,
    rrRange: [780, 880],
    waveParams: {
      pDur: 80, prSeg: 60, qDur: 20, rDur: 30, sDur: 30, stSeg: 80, tDur: 160,
      pAmp: 0.20, rAmp: 1.2, qAmp: -0.1, sAmpBase: -0.3, tAmp: 0.30,
    },
    powerline: { frequency: 60, amplitude: 0.08 },
    wander: { frequency: 0.15, amplitude: 0.2 },
  },
  {
    id: 'P-002',
    name: 'Patient P-002',
    condition: 'Sinus Bradycardia',
    rrMs: 1250,
    irregular: false,
    rrRange: [1150, 1350],
    waveParams: {
      pDur: 80, prSeg: 70, qDur: 20, rDur: 28, sDur: 30, stSeg: 90, tDur: 170,
      pAmp: 0.22, rAmp: 1.3, qAmp: -0.1, sAmpBase: -0.3, tAmp: 0.32,
    },
    powerline: { frequency: 50, amplitude: 0.1 },
    wander: { frequency: 0.2, amplitude: 0.25 },
  },
  {
    id: 'P-003',
    name: 'Patient P-003',
    condition: 'Sinus Tachycardia',
    rrMs: 522,
    irregular: false,
    rrRange: [490, 560],
    waveParams: {
      pDur: 70, prSeg: 50, qDur: 18, rDur: 28, sDur: 28, stSeg: 60, tDur: 130,
      pAmp: 0.18, rAmp: 1.1, qAmp: -0.08, sAmpBase: -0.25, tAmp: 0.25,
    },
    powerline: { frequency: 60, amplitude: 0.12 },
    wander: { frequency: 0.25, amplitude: 0.3 },
  },
  {
    id: 'P-004',
    name: 'Patient P-004',
    condition: 'Atrial Fibrillation',
    rrMs: 700,
    irregular: true,
    rrRange: [450, 1100],
    waveParams: {
      pDur: 40, prSeg: 30, qDur: 20, rDur: 30, sDur: 30, stSeg: 80, tDur: 150,
      pAmp: 0.04, rAmp: 1.15, qAmp: -0.1, sAmpBase: -0.3, tAmp: 0.28,
    },
    powerline: { frequency: 50, amplitude: 0.12 },
    wander: { frequency: 0.3, amplitude: 0.4 },
  },
  {
    id: 'P-005',
    name: 'Patient P-005',
    condition: 'First-Degree AV Block',
    rrMs: 882,
    irregular: false,
    rrRange: [830, 930],
    waveParams: {
      pDur: 90, prSeg: 130, qDur: 20, rDur: 30, sDur: 30, stSeg: 80, tDur: 160,
      pAmp: 0.22, rAmp: 1.2, qAmp: -0.1, sAmpBase: -0.3, tAmp: 0.30,
    },
    powerline: { frequency: 50, amplitude: 0.15 },
    wander: { frequency: 0.22, amplitude: 0.3 },
  },
  {
    id: 'P-006',
    name: 'Patient P-006',
    condition: 'ST Elevation (STEMI)',
    rrMs: 750,
    irregular: false,
    rrRange: [700, 800],
    waveParams: {
      pDur: 78, prSeg: 58, qDur: 22, rDur: 28, sDur: 28, stSeg: 100, tDur: 180,
      pAmp: 0.18, rAmp: 1.0, qAmp: -0.18, sAmpBase: -0.25, tAmp: 0.55,
    },
    powerline: { frequency: 60, amplitude: 0.1 },
    wander: { frequency: 0.25, amplitude: 0.3 },
  },
  {
    id: 'P-007',
    name: 'Patient P-007',
    condition: 'Prolonged QT',
    rrMs: 923,
    irregular: false,
    rrRange: [870, 970],
    waveParams: {
      pDur: 80, prSeg: 60, qDur: 20, rDur: 30, sDur: 30, stSeg: 120, tDur: 220,
      pAmp: 0.20, rAmp: 1.2, qAmp: -0.1, sAmpBase: -0.3, tAmp: 0.35,
    },
    powerline: { frequency: 60, amplitude: 0.08 },
    wander: { frequency: 0.2, amplitude: 0.2 },
  },
  {
    id: 'P-008',
    name: 'Patient P-008',
    condition: 'Wide QRS Complex',
    rrMs: 750,
    irregular: false,
    rrRange: [700, 800],
    waveParams: {
      pDur: 80, prSeg: 60, qDur: 35, rDur: 50, sDur: 50, stSeg: 70, tDur: 170,
      pAmp: 0.20, rAmp: 1.3, qAmp: -0.15, sAmpBase: -0.4, tAmp: 0.35,
    },
    powerline: { frequency: 50, amplitude: 0.1 },
    wander: { frequency: 0.15, amplitude: 0.25 },
  },
]

export const SAMPLING_RATE = 500
export const SEGMENT_DURATION = 10 // seconds
export const SEGMENT_SAMPLES = SAMPLING_RATE * SEGMENT_DURATION // 5000
