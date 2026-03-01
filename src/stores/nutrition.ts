import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { MealPlan, NutritionGoals, NutritionResult, Stage } from '@/types'

export const useNutritionStore = defineStore('nutrition', () => {
  const mealPlan = ref<MealPlan | null>(null)
  const goals = ref<NutritionGoals | null>(null)
  const results = ref<NutritionResult | null>(null)
  const currentStage = ref<Stage>(1)

  const hasValidMealPlan = computed(() => mealPlan.value !== null)
  const hasConfiguredGoals = computed(() => goals.value !== null)
  const hasResults = computed(() => results.value !== null)

  function setMealPlan(plan: MealPlan) {
    mealPlan.value = plan
  }

  function setGoals(g: NutritionGoals) {
    goals.value = g
  }

  function setResults(r: NutritionResult) {
    results.value = r
  }

  function goToStage(stage: Stage) {
    currentStage.value = stage
  }

  function reset() {
    mealPlan.value = null
    goals.value = null
    results.value = null
    currentStage.value = 1
  }

  return {
    mealPlan,
    goals,
    results,
    currentStage,
    hasValidMealPlan,
    hasConfiguredGoals,
    hasResults,
    setMealPlan,
    setGoals,
    setResults,
    goToStage,
    reset,
  }
})
