<script setup lang="ts">
import { AlertCircle, RefreshCw } from 'lucide-vue-next'

defineProps<{
  message: string
}>()

defineEmits<{
  retry: []
  back: []
}>()
</script>

<template>
  <div class="tb-error-state">
    <div class="tb-error-icon-wrap">
      <AlertCircle :size="24" class="tb-error-icon" />
    </div>
    <h3 class="tb-error-title">Something went wrong</h3>
    <p class="tb-error-message">{{ message }}</p>
    <div class="tb-error-actions">
      <button class="tb-btn-secondary" @click="$emit('back')">Edit Prompt</button>
      <button class="tb-btn-primary" @click="$emit('retry')">
        <RefreshCw :size="15" />
        Try Again
      </button>
    </div>
  </div>
</template>
