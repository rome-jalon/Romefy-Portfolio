import { geminiResponseSchema } from '@/types/task-breakdown-schemas'
import type { Task, GeminiTaskRaw } from '@/types/task-breakdown'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-2.0-flash-001'
const RETRY_DELAYS = [1000, 2000, 4000]

function generateId(): string {
  return crypto.randomUUID()
}

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
    return 'Insufficient OpenRouter credits. Please add credits at openrouter.ai/settings/credits.'
  }
  if (msg.includes('429')) {
    return 'Rate limited by OpenRouter. Please wait a moment and try again.'
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Cannot connect to OpenRouter. Please check your network connection and try again.'
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred while generating tasks.'
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

function buildSystemPrompt(hierarchical: boolean): string {
  return `You are a task breakdown assistant. Given an instruction (and optional context), break it down into clear, actionable tasks.

Return a JSON array of task objects. Each task must have:
- "title": a short, actionable task title
- "description": a 1-2 sentence description of what needs to be done
- "estimatedTime": a human-readable time estimate (e.g., "30 minutes", "2 hours")
- "priority": one of "low", "medium", or "high"
- "parentIndex": ${hierarchical ? 'an integer index (0-based) of the parent task in this array, or null for top-level tasks. Use this to create a hierarchy of tasks and subtasks.' : 'always null (flat list, no hierarchy)'}

Return ONLY the JSON array. No markdown, no explanation, no wrapping.`
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

function resolveParentIds(rawTasks: GeminiTaskRaw[]): Task[] {
  const ids = rawTasks.map(() => generateId())

  return rawTasks.map((raw, index) => {
    const id = ids[index] as string
    const parentId =
      raw.parentIndex !== null && raw.parentIndex >= 0 && raw.parentIndex < ids.length
        ? (ids[raw.parentIndex] as string)
        : null

    return {
      id,
      title: raw.title,
      description: raw.description,
      estimatedTime: raw.estimatedTime,
      priority: raw.priority as Task['priority'],
      parentId,
    }
  })
}

interface OpenRouterResponse {
  choices: { message: { content: string } }[]
}

export async function generateTaskBreakdown(
  instruction: string,
  mdContent: string | null,
  hierarchical: boolean,
): Promise<Task[]> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('Missing VITE_OPENROUTER_API_KEY environment variable. Get a key at openrouter.ai/settings/keys.')
  }

  const userPrompt = mdContent
    ? `Instruction:\n${instruction}\n\nAdditional Context:\n${mdContent}`
    : instruction

  const response = await withRetry(async () => {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-OpenRouter-Title': 'Romefy Task Breakdown',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(hierarchical) },
          { role: 'user', content: userPrompt },
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

  const data = Array.isArray(parsed) ? parsed : parsed.tasks ?? parsed.data ?? [parsed]
  const validated = geminiResponseSchema.parse(data)

  return resolveParentIds(validated as GeminiTaskRaw[])
}
