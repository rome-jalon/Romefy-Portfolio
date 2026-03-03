import type { ChangeStats, AiNarrative, LocationInfo } from '@/types/urban-change'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-2.0-flash-001'
const RETRY_DELAYS = [1000, 2000, 4000]

function isRetryable(error: unknown): boolean {
  const msg = String(error)
  return msg.includes('429') || msg.includes('500') || msg.includes('502') || msg.includes('503')
}

function humanizeError(error: unknown): string {
  const msg = String(error)
  if (msg.includes('401') || msg.includes('403')) {
    return 'OpenRouter API key is missing or invalid. Add your key as VITE_OPENROUTER_API_KEY in .env.local and restart the dev server.'
  }
  if (msg.includes('402')) {
    return 'OpenRouter account has insufficient credits. Please add credits at openrouter.ai.'
  }
  if (msg.includes('429')) {
    return 'Rate limit exceeded. Please wait a moment and try again.'
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Network error — check your internet connection and try again.'
  }
  return `AI analysis failed: ${msg}`
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

function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
}

function buildSystemPrompt(): string {
  return `You are an urban development analyst. Given data about building and land use changes in a geographic area between two time periods, generate an insightful analysis.

Respond in JSON with exactly these keys:
- "overview": A 2-3 sentence summary of the overall urban transformation.
- "keyChanges": A paragraph describing the most significant specific changes (new construction clusters, demolitions, land use shifts).
- "possibleDrivers": A paragraph speculating on likely causes based on the location, change patterns, and known urban development trends.
- "urbanContext": A paragraph placing these changes in broader urban development context (urbanization trends, economic factors, infrastructure patterns).

Be specific about numbers and percentages from the data. Reference the actual location name. Keep each section focused and informative.`
}

function buildUserPrompt(
  location: LocationInfo,
  yearA: number,
  yearB: number,
  stats: ChangeStats,
): string {
  const parts = [
    `Location: ${location.displayName} (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`,
    `Time period: ${yearA} → ${yearB}`,
    '',
    `Buildings in ${yearA}: ${stats.totalBuildingsYearA}`,
    `Buildings in ${yearB}: ${stats.totalBuildingsYearB}`,
    `New buildings: ${stats.addedCount}`,
    `Removed buildings: ${stats.removedCount}`,
    `Modified buildings: ${stats.modifiedCount}`,
    `Net building area change: ${stats.netAreaChangeM2 > 0 ? '+' : ''}${Math.round(stats.netAreaChangeM2)} m²`,
  ]

  if (stats.landUseShifts.length > 0) {
    parts.push('', 'Land use changes:')
    for (const shift of stats.landUseShifts) {
      parts.push(`  ${shift.from} → ${shift.to}: ${shift.count} areas`)
    }
  }

  return parts.join('\n')
}

export async function generateNarrative(
  location: LocationInfo,
  yearA: number,
  yearB: number,
  stats: ChangeStats,
): Promise<AiNarrative> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error(
      'Missing VITE_OPENROUTER_API_KEY. Get a key at openrouter.ai, add it to .env.local, and restart the dev server.',
    )
  }

  const result = await withRetry(async () => {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-OpenRouter-Title': 'Romefy Urban Change Detector',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(location, yearA, yearB, stats) },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      throw new Error(`${response.status}`)
    }

    return response.json()
  })

  const content = result.choices?.[0]?.message?.content ?? ''
  const text = stripMarkdownFences(content)
  const parsed = JSON.parse(text)

  return {
    overview: parsed.overview ?? '',
    keyChanges: parsed.keyChanges ?? '',
    possibleDrivers: parsed.possibleDrivers ?? '',
    urbanContext: parsed.urbanContext ?? '',
    fullText: `${parsed.overview}\n\n${parsed.keyChanges}\n\n${parsed.possibleDrivers}\n\n${parsed.urbanContext}`,
  }
}
