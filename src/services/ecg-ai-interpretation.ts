import { ecgAiInterpretationSchema } from '@/types/ecg-schemas'
import type { EcgAnalysisResult, EcgAiInterpretation } from '@/types/ecg'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-2.0-flash-001'
const RETRY_DELAYS = [1000, 2000, 4000]

function isRetryable(error: unknown): boolean {
  const msg = String(error)
  return msg.includes('500') || msg.includes('503') || msg.includes('502')
}

function humanizeError(error: unknown): string {
  const msg = String(error)
  if (msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized')) {
    return 'OpenRouter API key is missing or invalid. Add your key as VITE_OPENROUTER_API_KEY in .env.local. Get one at openrouter.ai/settings/keys.'
  }
  if (msg.includes('402')) {
    return 'The AI service has reached its usage limit for now. Please try again later or contact the site owner.'
  }
  if (msg.includes('429')) {
    return 'Too many requests — the AI service is temporarily busy. Please wait a few seconds and try again.'
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Cannot connect to OpenRouter. Please check your network connection and try again.'
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred while generating the ECG interpretation.'
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < RETRY_DELAYS.length && isRetryable(error)) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
      } else {
        throw new Error(humanizeError(error))
      }
    }
  }
  throw new Error(humanizeError(lastError))
}

function buildSystemPrompt(): string {
  return `You are a cardiology AI assistant specialized in ECG interpretation. Given extracted ECG metrics from a 12-lead electrocardiogram, provide a structured clinical interpretation.

Return ONLY a JSON object with these exact keys (each value is a string paragraph):
- "summary": 1-2 sentence overall interpretation
- "rhythmAnalysis": rhythm regularity and classification
- "rateAssessment": heart rate analysis and clinical significance
- "intervalAnalysis": PR, QRS, QT/QTc interval analysis
- "axisEstimation": estimated electrical axis based on lead amplitudes
- "abnormalityAssessment": detailed discussion of any detected abnormalities
- "clinicalCorrelation": suggested clinical correlations and recommended follow-up

Be thorough but concise. Use standard medical terminology. This is for educational purposes only.
Return ONLY the JSON object. No markdown, no explanation, no wrapping.`
}

function buildUserPrompt(result: EcgAnalysisResult): string {
  const lines: string[] = ['12-Lead ECG Analysis Results:', '']

  lines.push(`Heart Rate: ${Math.round(result.aggregateHeartRate)} bpm`)
  lines.push(`Rhythm: ${result.aggregateRhythm}`)
  lines.push('')

  lines.push('RR Interval Statistics:')
  lines.push(`  Mean: ${Math.round(result.aggregateRRStats.mean)} ms`)
  lines.push(`  Std Dev: ${result.aggregateRRStats.stdDev.toFixed(1)} ms`)
  lines.push(`  CV: ${result.aggregateRRStats.cv.toFixed(1)}%`)
  lines.push('')

  lines.push('Interval Measurements:')
  if (result.aggregateIntervals.pr !== null) {
    lines.push(`  PR Interval: ${Math.round(result.aggregateIntervals.pr)} ms`)
  }
  if (result.aggregateIntervals.qrs !== null) {
    lines.push(`  QRS Duration: ${Math.round(result.aggregateIntervals.qrs)} ms`)
  }
  if (result.aggregateIntervals.qt !== null) {
    lines.push(`  QT Interval: ${Math.round(result.aggregateIntervals.qt)} ms`)
  }
  if (result.aggregateIntervals.qtc !== null) {
    lines.push(`  QTc (Bazett): ${Math.round(result.aggregateIntervals.qtc)} ms`)
  }
  lines.push('')

  if (result.abnormalities.length > 0) {
    lines.push('Detected Abnormalities:')
    for (const flag of result.abnormalities) {
      lines.push(`  - ${flag.name} (${flag.severity}): ${flag.description}`)
    }
  } else {
    lines.push('No abnormalities detected.')
  }
  lines.push('')

  lines.push('Per-Lead Amplitude Summary:')
  for (const lead of result.leadAnalyses) {
    const min = Math.min(...lead.filteredSignal)
    const max = Math.max(...lead.filteredSignal)
    lines.push(`  ${lead.leadName}: min=${min.toFixed(2)}mV, max=${max.toFixed(2)}mV, R-peaks=${lead.rPeaks.indices.length}`)
  }

  return lines.join('\n')
}

function stripMarkdownFences(text: string): string {
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  return cleaned.trim()
}

interface OpenRouterResponse {
  choices: { message: { content: string } }[]
}

export async function generateEcgInterpretation(
  analysisResult: EcgAnalysisResult,
): Promise<EcgAiInterpretation> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('Missing VITE_OPENROUTER_API_KEY environment variable. Get a key at openrouter.ai/settings/keys.')
  }

  const response = await withRetry(async () => {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-OpenRouter-Title': 'Romefy ECG Analyzer',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(analysisResult) },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`)
    }

    return res.json() as Promise<OpenRouterResponse>
  })

  const content = response.choices[0]?.message?.content ?? ''
  const text = stripMarkdownFences(content)
  const parsed = JSON.parse(text)

  return ecgAiInterpretationSchema.parse(parsed) as EcgAiInterpretation
}
