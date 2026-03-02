import { z } from 'zod'
import { ECG_LEAD_NAMES } from './ecg'

const ecgMetadataSchema = z.object({
  patientId: z.string().optional(),
  recordingDate: z.string().optional(),
  device: z.string().optional(),
}).optional()

/**
 * Lead arrays use z.array(z.any()) to avoid Zod validating 60,000+ numbers
 * individually (which causes stack overflow in browsers). The .refine() below
 * checks that every element is a finite number via a simple loop instead.
 */
const numberArraySchema = z.array(z.any()).min(1).refine(
  (arr) => {
    for (let i = 0; i < arr.length; i++) {
      if (typeof arr[i] !== 'number' || Number.isNaN(arr[i])) return false
    }
    return true
  },
  { message: 'Lead array must contain only numbers' },
)

const leadsSchema = z.object(
  Object.fromEntries(
    ECG_LEAD_NAMES.map((name) => [name, numberArraySchema])
  ) as Record<(typeof ECG_LEAD_NAMES)[number], typeof numberArraySchema>
)

export const ecgDataSchema = z.object({
  metadata: ecgMetadataSchema,
  samplingRate: z.number().int().min(100, 'Sampling rate must be at least 100 Hz').max(10000, 'Sampling rate must not exceed 10,000 Hz'),
  duration: z.number().positive('Duration must be a positive number'),
  leads: leadsSchema,
}).refine(
  (data) => {
    const lengths = ECG_LEAD_NAMES.map((name) => data.leads[name].length)
    return lengths.every((len) => len === lengths[0])
  },
  { message: 'All lead arrays must have the same length' },
).refine(
  (data) => {
    const expectedLength = data.samplingRate * data.duration
    const actualLength = data.leads[ECG_LEAD_NAMES[0] as (typeof ECG_LEAD_NAMES)[number]].length
    const tolerance = expectedLength * 0.01
    return Math.abs(actualLength - expectedLength) <= tolerance
  },
  { message: 'Lead array length does not match samplingRate x duration (within 1% tolerance)' },
)

export const ecgAiInterpretationSchema = z.object({
  summary: z.string().min(1),
  rhythmAnalysis: z.string().min(1),
  rateAssessment: z.string().min(1),
  intervalAnalysis: z.string().min(1),
  axisEstimation: z.string().min(1),
  abnormalityAssessment: z.string().min(1),
  clinicalCorrelation: z.string().min(1),
})
