<script setup lang="ts">
import { ref, watch } from 'vue'
import draggable from 'vuedraggable'
import TaskCard from './TaskCard.vue'
import type { Task } from '@/types/task-breakdown'

const props = defineProps<{
  tasks: Task[]
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
  reorder: [tasks: Task[]]
}>()

const localList = ref<Task[]>([])

watch(
  () => props.tasks,
  (tasks) => {
    localList.value = tasks.filter((t) => t.parentId === null)
  },
  { immediate: true },
)

function getSubtasks(parentId: string): Task[] {
  return props.tasks.filter((t) => t.parentId === parentId)
}

function hasSubtasks(taskId: string): boolean {
  return props.tasks.some((t) => t.parentId === taskId)
}

function onDragEnd() {
  const reordered: Task[] = []
  for (const task of localList.value) {
    reordered.push(task)
    reordered.push(...getSubtasks(task.id))
  }
  emit('reorder', reordered)
}
</script>

<template>
  <div class="tb-task-list">
    <draggable
      v-model="localList"
      item-key="id"
      handle=".tb-card-drag-handle"
      :animation="200"
      ghost-class="tb-drag-ghost"
      @end="onDragEnd"
    >
      <template #item="{ element: task }">
        <div class="tb-task-group">
          <TaskCard
            :task="task"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
          />
          <div v-if="hasSubtasks(task.id)" class="tb-subtask-list">
            <TaskCard
              v-for="sub in getSubtasks(task.id)"
              :key="sub.id"
              :task="sub"
              :is-subtask="true"
              @edit="emit('edit', $event)"
              @delete="emit('delete', $event)"
            />
          </div>
        </div>
      </template>
    </draggable>
  </div>
</template>
