import { ref } from 'vue'
import type { MealPlan, NutritionResult, FoodNutrition, MealNutrition } from '@/types'
import { searchFood, extractNutrients } from '@/services/usda-api'
import { convertToGrams, scaleNutrients, calculateMealTotals } from '@/services/nutrition-calculator'

export function useNutritionFetcher() {
  const isLoading = ref(false)
  const progress = ref({ current: 0, total: 0 })
  const fetchError = ref<string | null>(null)
  const result = ref<NutritionResult | null>(null)

  async function fetchAllNutrition(mealPlan: MealPlan): Promise<NutritionResult | null> {
    isLoading.value = true
    fetchError.value = null
    result.value = null

    const apiKey = import.meta.env.VITE_USDA_API_KEY
    if (!apiKey) {
      fetchError.value =
        'USDA API key is missing. Create a .env.local file with VITE_USDA_API_KEY. Get a free key at https://fdc.nal.usda.gov/api-key-signup.html'
      isLoading.value = false
      return null
    }

    // Collect unique food names
    const uniqueFoods = new Set<string>()
    for (const meal of mealPlan.meals) {
      for (const item of meal.items) {
        uniqueFoods.add(item.food.toLowerCase())
      }
    }

    progress.value = { current: 0, total: uniqueFoods.size }

    // Fetch all unique foods
    const foodLookup = new Map<
      string,
      { nutrients: Record<string, number>; matchedName: string; servingSize?: number }
    >()

    for (const foodName of uniqueFoods) {
      const usdaFood = await searchFood(foodName)
      if (usdaFood) {
        foodLookup.set(foodName, {
          nutrients: extractNutrients(usdaFood),
          matchedName: usdaFood.description,
          servingSize: usdaFood.servingSize,
        })
      }
      progress.value = { current: progress.value.current + 1, total: uniqueFoods.size }
    }

    // Build meal nutrition data
    let totalFailedItems = 0
    const meals: MealNutrition[] = []

    for (const meal of mealPlan.meals) {
      const items: FoodNutrition[] = []

      for (const item of meal.items) {
        const lookup = foodLookup.get(item.food.toLowerCase())

        if (!lookup) {
          totalFailedItems++
          items.push({
            food: item.food,
            matchedName: 'Not found',
            quantity: item.quantity,
            unit: item.unit,
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            failed: true,
          })
          continue
        }

        const grams = convertToGrams(item.quantity, item.unit, lookup.servingSize)
        const scaled = scaleNutrients(lookup.nutrients, grams)

        items.push({
          food: item.food,
          matchedName: lookup.matchedName,
          quantity: item.quantity,
          unit: item.unit,
          calories: scaled.calories ?? 0,
          protein: scaled.protein ?? 0,
          fat: scaled.fat ?? 0,
          carbs: scaled.carbs ?? 0,
          fiber: scaled.fiber ?? 0,
          sugar: scaled.sugar ?? 0,
          sodium: scaled.sodium ?? 0,
          failed: false,
        })
      }

      meals.push({
        name: meal.name,
        time: meal.time,
        items,
        totals: calculateMealTotals(items),
      })
    }

    // Check if all items failed
    const totalItems = mealPlan.meals.reduce((sum, m) => sum + m.items.length, 0)
    if (totalFailedItems === totalItems) {
      fetchError.value =
        'All food items failed to resolve from the USDA database. Please check your API key and internet connection.'
      isLoading.value = false
      return null
    }

    // Calculate daily totals
    const dailyTotals: NutritionResult['dailyTotals'] = {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    }

    for (const meal of meals) {
      dailyTotals.calories += meal.totals.calories
      dailyTotals.protein += meal.totals.protein
      dailyTotals.fat += meal.totals.fat
      dailyTotals.carbs += meal.totals.carbs
      dailyTotals.fiber += meal.totals.fiber
      dailyTotals.sugar += meal.totals.sugar
      dailyTotals.sodium += meal.totals.sodium
    }

    // Round daily totals
    for (const key of Object.keys(dailyTotals) as (keyof typeof dailyTotals)[]) {
      dailyTotals[key] = Math.round(dailyTotals[key] * 10) / 10
    }

    const nutritionResult: NutritionResult = {
      planName: mealPlan.planName,
      meals,
      dailyTotals,
      failedItems: totalFailedItems,
    }

    result.value = nutritionResult
    isLoading.value = false
    return nutritionResult
  }

  return {
    isLoading,
    progress,
    fetchError,
    result,
    fetchAllNutrition,
  }
}
