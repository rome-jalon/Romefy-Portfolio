<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, Download, RefreshCw } from 'lucide-vue-next'
import TaskList from '@/components/task-breakdown/TaskList.vue'
import TaskLoadingState from '@/components/task-breakdown/TaskLoadingState.vue'
import TaskErrorState from '@/components/task-breakdown/TaskErrorState.vue'
import TaskEditModal from '@/components/task-breakdown/TaskEditModal.vue'
import DeleteConfirmDialog from '@/components/task-breakdown/DeleteConfirmDialog.vue'
import { useTaskBreakdownStore } from '@/stores/task-breakdown'
import { useTaskGenerator } from '@/composables/useTaskGenerator'
import { useTaskEditor } from '@/composables/useTaskEditor'
import { exportToExcel } from '@/services/excel-export'
import type { Task } from '@/types/task-breakdown'

const store = useTaskBreakdownStore()
const { regenerate } = useTaskGenerator()
const { editingTask, deletingTaskId, openEditModal, closeEditModal, openDeleteConfirm, closeDeleteConfirm } =
  useTaskEditor()

const taskCount = computed(() => store.tasks.length)

function goBack() {
  store.goToStage(1)
}

function handleEdit(task: Task) {
  openEditModal(task)
}

function handleSaveEdit(updates: Partial<Omit<Task, 'id'>>) {
  if (editingTask.value) {
    store.updateTask(editingTask.value.id, updates)
    closeEditModal()
  }
}

function handleDeleteRequest(id: string) {
  openDeleteConfirm(id)
}

function handleConfirmDelete() {
  if (deletingTaskId.value) {
    store.deleteTask(deletingTaskId.value)
    closeDeleteConfirm()
  }
}

function handleReorder(tasks: Task[]) {
  store.reorderTasks(tasks)
}

async function handleExport() {
  await exportToExcel(store.tasks)
}
</script>

<template>
  <div class="view-stack">
    <TaskLoadingState v-if="store.resultsState === 'loading'" />

    <TaskErrorState
      v-else-if="store.resultsState === 'error'"
      :message="store.errorMessage ?? 'An unexpected error occurred'"
      @retry="regenerate"
    />

    <template v-else-if="store.resultsState === 'success'">
      <div class="tb-results-header">
        <div class="tb-results-left">
          <button class="back-btn" @click="goBack">
            <ArrowLeft :size="16" />
          </button>
          <div>
            <h1 class="view-title">Task Breakdown</h1>
            <p class="view-subtitle">{{ taskCount }} tasks generated</p>
          </div>
        </div>
        <div class="tb-results-actions">
          <button class="tb-btn-secondary" @click="regenerate">
            <RefreshCw :size="14" />
            Regenerate
          </button>
          <button class="tb-btn-primary" @click="handleExport">
            <Download :size="14" />
            Export .xlsx
          </button>
        </div>
      </div>

      <TaskList
        :tasks="store.tasks"
        @edit="handleEdit"
        @delete="handleDeleteRequest"
        @reorder="handleReorder"
      />
    </template>

    <TaskEditModal
      v-if="editingTask"
      :task="editingTask"
      @save="handleSaveEdit"
      @close="closeEditModal"
    />

    <DeleteConfirmDialog
      v-if="deletingTaskId"
      @confirm="handleConfirmDelete"
      @cancel="closeDeleteConfirm"
    />
  </div>
</template>
