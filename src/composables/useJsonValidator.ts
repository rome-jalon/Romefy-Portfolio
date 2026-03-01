import { ref, computed } from 'vue'
import { MealPlanSchema } from '@/types/schemas'
import type { MealPlan, ValidationError } from '@/types'

export function useJsonValidator() {
  const parsedPlan = ref<MealPlan | null>(null)
  const validationErrors = ref<ValidationError[]>([])
  const parseError = ref<string | null>(null)

  const isValid = computed(() => parsedPlan.value !== null && validationErrors.value.length === 0 && !parseError.value)
  const hasContent = computed(() => parsedPlan.value !== null || parseError.value !== null || validationErrors.value.length > 0)

  function validate(content: string, filename: string): boolean {
    // Reset state
    parsedPlan.value = null
    validationErrors.value = []
    parseError.value = null

    if (!filename.endsWith('.json')) {
      parseError.value = `"${filename}" is not a JSON file. Please upload a .json file.`
      return false
    }

    if (!content) {
      parseError.value = 'File is empty or could not be read.'
      return false
    }

    // Step 1: Parse JSON
    let raw: unknown
    try {
      raw = JSON.parse(content)
    } catch (e) {
      const err = e as SyntaxError
      parseError.value = `Invalid JSON syntax: ${err.message}`
      return false
    }

    // Step 2: Validate against schema
    const result = MealPlanSchema.safeParse(raw)

    if (!result.success) {
      validationErrors.value = result.error.issues.map((issue) => {
        const path = issue.path
        const error: ValidationError = {
          path: path.join('.'),
          message: issue.message,
        }

        // Determine meal and item indices for location display
        if (path.length >= 2 && path[0] === 'meals') {
          error.mealIndex = path[1] as number

          if (path.length >= 4 && path[2] === 'items') {
            error.itemIndex = path[3] as number
          }
        }

        return error
      })

      // Even with errors, try to parse for preview (best-effort)
      try {
        parsedPlan.value = raw as MealPlan
      } catch {
        // Can't preview invalid data
      }

      return false
    }

    parsedPlan.value = result.data as MealPlan
    return true
  }

  function reset() {
    parsedPlan.value = null
    validationErrors.value = []
    parseError.value = null
  }

  return {
    parsedPlan,
    validationErrors,
    parseError,
    isValid,
    hasContent,
    validate,
    reset,
  }
}
