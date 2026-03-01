/* ── Meal Plan ── */

export type UnitType = 'g' | 'ml' | 'oz' | 'cup' | 'tbsp' | 'tsp' | 'piece'

export interface MealItem {
  food: string
  quantity: number
  unit: UnitType
}

export interface Meal {
  name: string
  time: string
  items: MealItem[]
}

export interface MealPlan {
  planName: string
  meals: Meal[]
}

/* ── Nutrition Goals ── */

export interface MacroSplit {
  protein: number
  carbs: number
  fat: number
}

export interface ThresholdAlerts {
  sodiumMax: number
  sugarMax: number
  fiberMin: number
}

export interface NutritionGoals {
  calorieTarget: number
  macroSplit: MacroSplit
  thresholds: ThresholdAlerts
}

/* ── Nutrition Results (Stage 3) ── */

export interface FoodNutrition {
  food: string
  matchedName: string
  quantity: number
  unit: UnitType
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  sugar: number
  sodium: number
  failed: boolean
}

export interface MealNutrition {
  name: string
  time: string
  items: FoodNutrition[]
  totals: Omit<FoodNutrition, 'food' | 'matchedName' | 'quantity' | 'unit' | 'failed'>
}

export interface NutritionResult {
  planName: string
  meals: MealNutrition[]
  dailyTotals: Omit<FoodNutrition, 'food' | 'matchedName' | 'quantity' | 'unit' | 'failed'>
  failedItems: number
}

/* ── USDA API ── */

export interface USDANutrient {
  nutrientId: number
  nutrientName: string
  value: number
  unitName: string
}

export interface USDAFood {
  fdcId: number
  description: string
  foodNutrients: USDANutrient[]
  servingSize?: number
  servingSizeUnit?: string
}

export interface USDASearchResponse {
  foods: USDAFood[]
  totalHits: number
}

/* ── Constants ── */

export const NUTRIENT_IDS = {
  calories: 1008,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  fiber: 1079,
  sugar: 2000,
  sodium: 1093,
} as const

export const UNIT_TO_GRAMS: Record<UnitType, number> = {
  g: 1,
  ml: 1,
  oz: 28.35,
  cup: 240,
  tbsp: 15,
  tsp: 5,
  piece: 100, // fallback, overridden by USDA serving size when available
}

export const VALID_UNITS: UnitType[] = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece']

/* ── Stage ── */

export type Stage = 1 | 2 | 3

/* ── Validation ── */

export interface ValidationError {
  path: string
  message: string
  mealIndex?: number
  itemIndex?: number
}
