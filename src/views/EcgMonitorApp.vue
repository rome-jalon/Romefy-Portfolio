<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { HeartPulse } from 'lucide-vue-next'
import { useEcgMonitorStore } from '@/stores/ecg-monitor'
import { MONITOR_PATIENTS } from '@/config/monitor-patients'
import MonitorSweepCanvas from '@/components/ecg-monitor/MonitorSweepCanvas.vue'
import MonitorFindings from '@/components/ecg-monitor/MonitorFindings.vue'
import MonitorActions from '@/components/ecg-monitor/MonitorActions.vue'
import MonitorToast from '@/components/ecg-monitor/MonitorToast.vue'
import MonitorNotificationLog from '@/components/ecg-monitor/MonitorNotificationLog.vue'

const store = useEcgMonitorStore()
const canvasRef = ref<InstanceType<typeof MonitorSweepCanvas> | null>(null)

function handlePreviousPatient() {
  if (!canvasRef.value) return
  const feed = canvasRef.value.feed
  feed.previousPatient()
  store.setPatient(feed.currentPatient.value)
}

function handleNextPatient() {
  if (!canvasRef.value) return
  const feed = canvasRef.value.feed
  feed.nextPatient()
  store.setPatient(feed.currentPatient.value)
}

onMounted(async () => {
  const firstPatient = MONITOR_PATIENTS[0]!
  store.setPatient(firstPatient)

  await nextTick()

  if (canvasRef.value) {
    canvasRef.value.feed.switchPatient(0)
    canvasRef.value.resetSweep()
    canvasRef.value.start()
  }
})

onBeforeRouteLeave(() => {
  if (canvasRef.value) {
    canvasRef.value.stop()
  }
  store.reset()
})
</script>

<template>
  <div class="monitor-shell">
    <header class="monitor-header">
      <router-link to="/" class="ecg-back-link">← Portfolio</router-link>
      <HeartPulse :size="24" />
      <span class="ecg-header-title">Lead II Monitor</span>
      <span v-if="store.currentPatient" class="ecg-header-subtitle">
        {{ store.currentPatient.id }} — {{ store.currentPatient.condition }}
      </span>
      <span class="monitor-disclaimer">For demonstration purposes only — not for clinical use</span>
    </header>

    <div class="monitor-body">
      <MonitorSweepCanvas ref="canvasRef" />

      <div class="monitor-panel">
        <div class="monitor-panel-inner">
          <MonitorFindings />
          <MonitorActions @previous-patient="handlePreviousPatient" @next-patient="handleNextPatient" />
        </div>
      </div>
    </div>

    <MonitorNotificationLog />
    <MonitorToast />
  </div>
</template>
