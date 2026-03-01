import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Task, TaskBreakdownInput, TaskBreakdownStage, ResultsState } from '@/types/task-breakdown'

export const useTaskBreakdownStore = defineStore('task-breakdown', () => {
  const currentStage = ref<TaskBreakdownStage>(1)
  const input = ref<TaskBreakdownInput>({
    instruction: '',
    mdContent: null,
    hierarchical: false,
  })
  const tasks = ref<Task[]>([])
  const resultsState = ref<ResultsState>('idle')
  const errorMessage = ref<string | null>(null)

  function setInput(payload: Partial<TaskBreakdownInput>) {
    Object.assign(input.value, payload)
  }

  function setTasks(newTasks: Task[]) {
    tasks.value = newTasks
  }

  function updateTask(id: string, updates: Partial<Omit<Task, 'id'>>) {
    const task = tasks.value.find((t) => t.id === id)
    if (task) {
      Object.assign(task, updates)
    }
  }

  function deleteTask(id: string) {
    tasks.value = tasks.value.filter((t) => t.id !== id && t.parentId !== id)
  }

  function reorderTasks(reordered: Task[]) {
    tasks.value = reordered
  }

  function goToStage(stage: TaskBreakdownStage) {
    currentStage.value = stage
  }

  function setResultsState(state: ResultsState) {
    resultsState.value = state
  }

  function setError(message: string | null) {
    errorMessage.value = message
  }

  function reset() {
    currentStage.value = 1
    input.value = { instruction: '', mdContent: null, hierarchical: false }
    tasks.value = []
    resultsState.value = 'idle'
    errorMessage.value = null
  }

  return {
    currentStage,
    input,
    tasks,
    resultsState,
    errorMessage,
    setInput,
    setTasks,
    updateTask,
    deleteTask,
    reorderTasks,
    goToStage,
    setResultsState,
    setError,
    reset,
  }
})
