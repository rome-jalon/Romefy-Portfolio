<script setup lang="ts">
import { watch } from 'vue'
import { useEcgMonitorStore } from '@/stores/ecg-monitor'

const store = useEcgMonitorStore()
let dismissTimer: ReturnType<typeof setTimeout> | null = null

watch(() => store.activeToast, (toast) => {
  if (dismissTimer) clearTimeout(dismissTimer)
  if (toast) {
    dismissTimer = setTimeout(() => {
      store.dismissToast()
    }, 5000)
  }
})
</script>

<template>
  <Transition name="monitor-toast">
    <div
      v-if="store.activeToast"
      class="monitor-toast"
      :class="{
        'is-routine': store.activeToast.urgency === 'routine',
        'is-urgent': store.activeToast.urgency === 'urgent',
        'is-critical': store.activeToast.urgency === 'critical',
      }"
    >
      <button class="monitor-toast-close" @click="store.dismissToast()">×</button>
      <div class="monitor-toast-title">
        Alert sent for {{ store.activeToast.patientName }}
      </div>
      <div class="monitor-toast-body">
        {{ store.activeToast.urgency.charAt(0).toUpperCase() + store.activeToast.urgency.slice(1) }}:
        {{ store.activeToast.finding }}
      </div>
    </div>
  </Transition>
</template>
