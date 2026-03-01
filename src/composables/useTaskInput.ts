import { ref, computed } from 'vue'
import { instructionSchema } from '@/types/task-breakdown-schemas'

export function useTaskInput() {
  const instruction = ref('')
  const hierarchical = ref(false)
  const validationError = ref<string | null>(null)

  const charCount = computed(() => instruction.value.length)
  const isOverLimit = computed(() => charCount.value > 1000)

  function validate(): boolean {
    const result = instructionSchema.safeParse(instruction.value)
    if (!result.success) {
      validationError.value = result.error.issues[0]?.message ?? 'Invalid instruction'
      return false
    }
    validationError.value = null
    return true
  }

  function setInstruction(value: string) {
    instruction.value = value
    if (validationError.value) {
      validationError.value = null
    }
  }

  function toggleHierarchical() {
    hierarchical.value = !hierarchical.value
  }

  return {
    instruction,
    hierarchical,
    validationError,
    charCount,
    isOverLimit,
    validate,
    setInstruction,
    toggleHierarchical,
  }
}
