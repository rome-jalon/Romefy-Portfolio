<script setup lang="ts">
import { GripVertical, Pencil, Trash2, Clock, ChevronRight } from 'lucide-vue-next'
import type { Task } from '@/types/task-breakdown'

defineProps<{
  task: Task
  isSubtask?: boolean
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
}>()
</script>

<template>
  <div class="tb-card" :class="{ 'is-subtask': isSubtask }">
    <div class="tb-card-drag-handle">
      <GripVertical :size="16" />
    </div>

    <div class="tb-card-body">
      <div class="tb-card-header">
        <ChevronRight v-if="isSubtask" :size="14" class="tb-card-subtask-icon" />
        <h3 class="tb-card-title">{{ task.title }}</h3>
        <span class="tb-priority-badge" :class="`is-${task.priority}`">
          {{ task.priority }}
        </span>
      </div>

      <p class="tb-card-desc">{{ task.description }}</p>

      <div class="tb-card-footer">
        <div class="tb-card-meta">
          <span class="tb-time-badge">
            <Clock :size="12" />
            {{ task.estimatedTime }}
          </span>
        </div>

        <div class="tb-card-actions">
          <button class="tb-card-action-btn" @click="emit('edit', task)">
            <Pencil :size="13" />
          </button>
          <button class="tb-card-action-btn is-danger" @click="emit('delete', task.id)">
            <Trash2 :size="13" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
