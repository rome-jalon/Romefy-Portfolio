import { ref } from 'vue'
import type { Task } from '@/types/task-breakdown'

export function useTaskEditor() {
  const editingTask = ref<Task | null>(null)
  const deletingTaskId = ref<string | null>(null)

  function openEditModal(task: Task) {
    editingTask.value = { ...task }
  }

  function closeEditModal() {
    editingTask.value = null
  }

  function openDeleteConfirm(taskId: string) {
    deletingTaskId.value = taskId
  }

  function closeDeleteConfirm() {
    deletingTaskId.value = null
  }

  return {
    editingTask,
    deletingTaskId,
    openEditModal,
    closeEditModal,
    openDeleteConfirm,
    closeDeleteConfirm,
  }
}
