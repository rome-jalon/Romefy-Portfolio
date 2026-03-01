import axios from 'axios'
import type { USDAFood, USDASearchResponse } from '@/types'
import { NUTRIENT_IDS } from '@/types'

const cache = new Map<string, USDAFood | null>()

const RETRY_DELAYS = [1000, 2000, 4000]

function isRetryable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  if (!error.response) return true // network error
  return error.response.status >= 500
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
        throw error
      }
    }
  }
  throw lastError
}

export async function searchFood(foodName: string): Promise<USDAFood | null> {
  const key = foodName.toLowerCase()
  if (cache.has(key)) return cache.get(key)!

  try {
    const response = await withRetry(() =>
      axios.get<USDASearchResponse>('https://api.nal.usda.gov/fdc/v1/foods/search', {
        params: {
          query: foodName,
          pageSize: 1,
          api_key: import.meta.env.VITE_USDA_API_KEY,
        },
      }),
    )

    const food = response.data.foods?.[0] ?? null
    cache.set(key, food)
    return food
  } catch {
    cache.set(key, null)
    return null
  }
}

export function extractNutrients(food: USDAFood): Record<string, number> {
  const nutrients: Record<string, number> = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  }

  for (const [name, id] of Object.entries(NUTRIENT_IDS)) {
    const found = food.foodNutrients.find((n) => n.nutrientId === id)
    if (found) {
      nutrients[name] = found.value
    }
  }

  return nutrients
}
