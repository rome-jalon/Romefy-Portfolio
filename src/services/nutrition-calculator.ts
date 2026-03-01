import type { UnitType, FoodNutrition, MealNutrition } from '@/types'
import { UNIT_TO_GRAMS } from '@/types'

export function convertToGrams(
  quantity: number,
  unit: UnitType,
  servingSize?: number,
): number {
  if (unit === 'piece') {
    return quantity * (servingSize ?? UNIT_TO_GRAMS.piece)
  }
  return quantity * UNIT_TO_GRAMS[unit]
}

export function scaleNutrients(
  per100g: Record<string, number>,
  quantityInGrams: number,
): Record<string, number> {
  const scaled: Record<string, number> = {}
  for (const [key, value] of Object.entries(per100g)) {
    scaled[key] = Math.round((value * quantityInGrams) / 100 * 10) / 10
  }
  return scaled
}

export function getDeviationColor(
  actual: number,
  goal: number,
): 'green' | 'yellow' | 'red' {
  if (goal === 0) return 'red'
  const deviation = Math.abs(actual - goal) / goal
  if (deviation <= 0.1) return 'green'
  if (deviation <= 0.25) return 'yellow'
  return 'red'
}

export function calculateMealTotals(
  items: FoodNutrition[],
): MealNutrition['totals'] {
  return {
    calories: Math.round(items.reduce((sum, i) => sum + i.calories, 0) * 10) / 10,
    protein: Math.round(items.reduce((sum, i) => sum + i.protein, 0) * 10) / 10,
    fat: Math.round(items.reduce((sum, i) => sum + i.fat, 0) * 10) / 10,
    carbs: Math.round(items.reduce((sum, i) => sum + i.carbs, 0) * 10) / 10,
    fiber: Math.round(items.reduce((sum, i) => sum + i.fiber, 0) * 10) / 10,
    sugar: Math.round(items.reduce((sum, i) => sum + i.sugar, 0) * 10) / 10,
    sodium: Math.round(items.reduce((sum, i) => sum + i.sodium, 0) * 10) / 10,
  }
}
