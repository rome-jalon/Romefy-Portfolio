import { ref, shallowRef } from 'vue'
import type { MonitorPatientProfile, MonitorWaveParams } from '@/types/ecg-monitor'
import { MONITOR_PATIENTS, SAMPLING_RATE, SEGMENT_SAMPLES } from '@/config/monitor-patients'

function gaussian(t: number, center: number, width: number, amplitude: number): number {
  const z = (t - center) / width
  return amplitude * Math.exp(-0.5 * z * z)
}

function randn(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function generateBeatSamples(beatSamples: number, params: MonitorWaveParams): number[] {
  const { pDur, prSeg, qDur, rDur, sDur, stSeg, tDur, pAmp, rAmp, qAmp, sAmpBase, tAmp } = params

  const pD = pDur / 1000
  const prS = prSeg / 1000
  const qD = qDur / 1000
  const rD = rDur / 1000
  const sD = sDur / 1000
  const stS = stSeg / 1000
  const tD = tDur / 1000

  const pCenter = pD / 2
  const prEnd = pD + prS
  const qCenter = prEnd + qD / 2
  const rCenter = prEnd + qD + rD / 2
  const sCenter = prEnd + qD + rD + sD / 2
  const stEnd = prEnd + qD + rD + sD + stS
  const tCenter = stEnd + tD / 2

  const pSigma = pD / 4
  const qSigma = qD / 4
  const rSigma = rD / 4
  const sSigma = sD / 4
  const tSigma = tD / 4

  const dt = 1 / SAMPLING_RATE
  const samples = new Array<number>(beatSamples)

  for (let i = 0; i < beatSamples; i++) {
    const t = i * dt
    let val = 0
    val += gaussian(t, pCenter, pSigma, pAmp)
    val += gaussian(t, qCenter, qSigma, qAmp)
    val += gaussian(t, rCenter, rSigma, rAmp)
    val += gaussian(t, sCenter, sSigma, sAmpBase)
    val += gaussian(t, tCenter, tSigma, tAmp)
    val += randn() * 0.02
    samples[i] = val
  }

  return samples
}

export function useMonitorFeed() {
  const currentPatientIndex = ref(0)
  const currentPatient = shallowRef<MonitorPatientProfile>(MONITOR_PATIENTS[0]!)
  const buffer = shallowRef<number[]>([])
  const segmentReady = ref(false)
  const lastSegment = shallowRef<number[]>([])

  let sampleCount = 0
  let beatBuffer: number[] = []
  let beatPosition = 0
  let globalSampleIndex = 0

  function generateNextBeat(): number[] {
    const patient = currentPatient.value
    let rrSamples: number
    if (patient.irregular) {
      const rrMs = patient.rrRange[0] + Math.random() * (patient.rrRange[1] - patient.rrRange[0])
      rrSamples = Math.round((rrMs / 1000) * SAMPLING_RATE)
    } else {
      rrSamples = Math.round((patient.rrMs / 1000) * SAMPLING_RATE)
    }
    return generateBeatSamples(rrSamples, patient.waveParams)
  }

  function getNextSample(): number {
    if (beatPosition >= beatBuffer.length) {
      beatBuffer = generateNextBeat()
      beatPosition = 0
    }

    let sample = beatBuffer[beatPosition]!
    const t = globalSampleIndex / SAMPLING_RATE
    const patient = currentPatient.value

    // Add powerline noise
    sample += patient.powerline.amplitude * Math.sin(2 * Math.PI * patient.powerline.frequency * t)
    // Add baseline wander
    sample += patient.wander.amplitude * Math.sin(2 * Math.PI * patient.wander.frequency * t)

    beatPosition++
    globalSampleIndex++
    return sample
  }

  function consumeSamples(count: number): number[] {
    const samples: number[] = []
    for (let i = 0; i < count; i++) {
      const sample = getNextSample()
      samples.push(sample)
      sampleCount++

      if (sampleCount >= SEGMENT_SAMPLES) {
        lastSegment.value = [...buffer.value, ...samples]
        segmentReady.value = true
        sampleCount = 0
        buffer.value = []
        return samples
      }
    }
    buffer.value = [...buffer.value, ...samples]
    return samples
  }

  function switchPatient(index: number) {
    currentPatientIndex.value = index % MONITOR_PATIENTS.length
    currentPatient.value = MONITOR_PATIENTS[currentPatientIndex.value]!
    buffer.value = []
    lastSegment.value = []
    segmentReady.value = false
    sampleCount = 0
    beatBuffer = []
    beatPosition = 0
    globalSampleIndex = 0
  }

  function nextPatient() {
    switchPatient(currentPatientIndex.value + 1)
  }

  function acknowledgeSegment() {
    segmentReady.value = false
  }

  return {
    currentPatient,
    currentPatientIndex,
    buffer,
    segmentReady,
    lastSegment,
    consumeSamples,
    switchPatient,
    nextPatient,
    acknowledgeSegment,
  }
}
