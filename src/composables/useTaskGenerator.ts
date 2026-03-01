import { useTaskBreakdownStore } from '@/stores/task-breakdown'
import { generateTaskBreakdown } from '@/services/gemini-api'

export function useTaskGenerator() {
  const store = useTaskBreakdownStore()

  async function generate() {
    store.setResultsState('loading')
    store.setError(null)
    store.goToStage(2)

    try {
      const tasks = await generateTaskBreakdown(
        store.input.instruction,
        store.input.mdContent,
        store.input.hierarchical,
      )
      store.setTasks(tasks)
      store.setResultsState('success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      store.setError(message)
      store.setResultsState('error')
    }
  }

  async function regenerate() {
    store.setTasks([])
    await generate()
  }

  return {
    generate,
    regenerate,
  }
}
