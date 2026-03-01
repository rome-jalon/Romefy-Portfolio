<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import type { Task, TaskPriority } from '@/types/task-breakdown'

const props = defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  save: [updates: Partial<Omit<Task, 'id'>>]
  close: []
}>()

const title = ref(props.task.title)
const description = ref(props.task.description)
const estimatedTime = ref(props.task.estimatedTime)
const priority = ref<TaskPriority>(props.task.priority)

watch(
  () => props.task,
  (t) => {
    title.value = t.title
    description.value = t.description
    estimatedTime.value = t.estimatedTime
    priority.value = t.priority
  },
)

function handleSave() {
  if (!title.value.trim()) return
  emit('save', {
    title: title.value.trim(),
    description: description.value.trim(),
    estimatedTime: estimatedTime.value.trim(),
    priority: priority.value,
  })
}

function handleOverlayClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <div class="tb-modal-overlay" @click="handleOverlayClick">
    <div class="tb-modal">
      <div class="tb-modal-header">
        <h3 class="tb-modal-title">Edit Task</h3>
        <button class="tb-modal-close" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div class="tb-modal-body">
        <div class="tb-modal-field">
          <label class="tb-label">Title</label>
          <input v-model="title" class="tb-input" type="text" />
        </div>

        <div class="tb-modal-field">
          <label class="tb-label">Description</label>
          <textarea v-model="description" class="tb-textarea tb-modal-textarea" rows="3"></textarea>
        </div>

        <div class="tb-modal-row">
          <div class="tb-modal-field">
            <label class="tb-label">Estimated Time</label>
            <input v-model="estimatedTime" class="tb-input" type="text" />
          </div>

          <div class="tb-modal-field">
            <label class="tb-label">Priority</label>
            <select v-model="priority" class="tb-select">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </div>

      <div class="tb-modal-footer">
        <button class="tb-btn-secondary" @click="emit('close')">Cancel</button>
        <button class="tb-btn-primary" @click="handleSave">Save Changes</button>
      </div>
    </div>
  </div>
</template>
