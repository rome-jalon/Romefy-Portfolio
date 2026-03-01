<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function handleOverlayClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('cancel')
  }
}
</script>

<template>
  <div class="tb-modal-overlay" @click="handleOverlayClick">
    <div class="tb-confirm-dialog">
      <div class="tb-confirm-icon-wrap">
        <AlertTriangle :size="24" class="tb-confirm-icon" />
      </div>
      <h3 class="tb-confirm-title">Delete Task</h3>
      <p class="tb-confirm-desc">
        Are you sure you want to delete this task? This action cannot be undone.
      </p>
      <div class="tb-confirm-actions">
        <button class="tb-btn-secondary" @click="emit('cancel')">Cancel</button>
        <button class="tb-btn-danger" @click="emit('confirm')">Delete</button>
      </div>
    </div>
  </div>
</template>
