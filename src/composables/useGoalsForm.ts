import { ref, computed } from 'vue'
import type { NutritionGoals } from '@/types'

export function useGoalsForm() {
  // ── Calorie target ──
  const calorieTarget = ref(2000)

  // ── Macro percentages (each 5–60%, must sum to 100) ──
  const proteinPct = ref(30)
  const carbsPct = ref(40)
  const fatPct = ref(30)

  // ── Threshold alerts ──
  const sodiumMax = ref(2300)
  const sugarMax = ref(50)
  const fiberMin = ref(25)

  // ── Computed gram values ──
  const proteinGrams = computed(() => {
    const cal = Number(calorieTarget.value)
    if (!cal || isNaN(cal)) return 0
    return Math.round((cal * proteinPct.value) / 100 / 4)
  })

  const carbsGrams = computed(() => {
    const cal = Number(calorieTarget.value)
    if (!cal || isNaN(cal)) return 0
    return Math.round((cal * carbsPct.value) / 100 / 4)
  })

  const fatGrams = computed(() => {
    const cal = Number(calorieTarget.value)
    if (!cal || isNaN(cal)) return 0
    return Math.round((cal * fatPct.value) / 100 / 9)
  })

  // ── Macro total ──
  const macroTotal = computed(() => proteinPct.value + carbsPct.value + fatPct.value)

  // ── Validation ──
  const calorieError = computed(() => {
    const cal = Number(calorieTarget.value)
    if (!cal || isNaN(cal)) return 'Enter a calorie target'
    if (cal < 500) return 'Minimum 500 kcal'
    if (cal > 10000) return 'Maximum 10,000 kcal'
    return null
  })

  const isValid = computed(() => {
    const cal = Number(calorieTarget.value)
    return cal >= 500 && cal <= 10000 && macroTotal.value === 100
  })

  // ── Proportional macro adjustment ──
  function adjustMacro(changed: 'protein' | 'carbs' | 'fat', rawValue: number) {
    const MIN = 5
    const MAX = 60
    const newValue = Math.max(MIN, Math.min(MAX, Math.round(rawValue)))

    const refs = { protein: proteinPct, carbs: carbsPct, fat: fatPct }
    const others = (Object.keys(refs) as Array<'protein' | 'carbs' | 'fat'>).filter(
      (k) => k !== changed,
    )

    const otherA = refs[others[0]!]
    const otherB = refs[others[1]!]

    refs[changed].value = newValue

    const remaining = 100 - newValue
    const currentOtherSum = otherA.value + otherB.value

    if (currentOtherSum === 0) {
      otherA.value = Math.round(remaining / 2)
      otherB.value = remaining - otherA.value
    } else {
      let aTarget = Math.round((otherA.value / currentOtherSum) * remaining)
      let bTarget = remaining - aTarget

      aTarget = Math.max(MIN, Math.min(MAX, aTarget))
      bTarget = Math.max(MIN, Math.min(MAX, bTarget))

      const total = newValue + aTarget + bTarget
      if (total !== 100) {
        const diff = 100 - total
        if (bTarget + diff >= MIN && bTarget + diff <= MAX) {
          bTarget += diff
        } else if (aTarget + diff >= MIN && aTarget + diff <= MAX) {
          aTarget += diff
        }
      }

      otherA.value = aTarget
      otherB.value = bTarget
    }
  }

  // ── Build goals object for store ──
  function buildGoals(): NutritionGoals {
    return {
      calorieTarget: Number(calorieTarget.value),
      macroSplit: {
        protein: proteinPct.value,
        carbs: carbsPct.value,
        fat: fatPct.value,
      },
      thresholds: {
        sodiumMax: Number(sodiumMax.value),
        sugarMax: Number(sugarMax.value),
        fiberMin: Number(fiberMin.value),
      },
    }
  }

  // ── Restore from existing goals (back-navigation) ──
  function restoreFromGoals(goals: NutritionGoals) {
    calorieTarget.value = goals.calorieTarget
    proteinPct.value = goals.macroSplit.protein
    carbsPct.value = goals.macroSplit.carbs
    fatPct.value = goals.macroSplit.fat
    sodiumMax.value = goals.thresholds.sodiumMax
    sugarMax.value = goals.thresholds.sugarMax
    fiberMin.value = goals.thresholds.fiberMin
  }

  return {
    calorieTarget,
    proteinPct,
    carbsPct,
    fatPct,
    sodiumMax,
    sugarMax,
    fiberMin,
    proteinGrams,
    carbsGrams,
    fatGrams,
    macroTotal,
    calorieError,
    isValid,
    adjustMacro,
    buildGoals,
    restoreFromGoals,
  }
}
