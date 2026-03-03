<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useMonitorSweep } from '@/composables/useMonitorSweep'
import { useMonitorFeed } from '@/composables/useMonitorFeed'
import { useMonitorAnalysis } from '@/composables/useMonitorAnalysis'
import { useEcgMonitorStore } from '@/stores/ecg-monitor'
import { SAMPLING_RATE } from '@/config/monitor-patients'

const store = useEcgMonitorStore()
const feed = useMonitorFeed()
const { runAnalysis } = useMonitorAnalysis()

const canvasRef = ref<HTMLCanvasElement | null>(null)

// Feed samples to sweep at a steady rate
const FEED_INTERVAL = 50 // ms
const SAMPLES_PER_TICK = Math.round(SAMPLING_RATE * (FEED_INTERVAL / 1000)) // 25 samples

let feedTimer: ReturnType<typeof setInterval> | null = null

function tickFeed(): number[] {
  return feed.consumeSamples(SAMPLES_PER_TICK)
}

const { start, stop, reset: resetSweep } = useMonitorSweep(canvasRef, tickFeed)

// Watch for completed segments
watch(() => feed.segmentReady.value, (ready) => {
  if (ready && feed.lastSegment.value.length > 0) {
    runAnalysis(feed.lastSegment.value)
    feed.acknowledgeSegment()
  }
})

// Sync patient from store to feed
watch(() => store.currentPatient, (patient) => {
  if (patient) {
    const index = feed.currentPatientIndex.value
    feed.switchPatient(index)
    resetSweep()
    start()
  }
})

onMounted(() => {
  if (store.currentPatient) {
    start()
  }
})

onBeforeUnmount(() => {
  stop()
  if (feedTimer) clearInterval(feedTimer)
})

defineExpose({ feed, resetSweep, start, stop })
</script>

<template>
  <div class="monitor-canvas-wrap">
    <canvas ref="canvasRef" class="monitor-canvas" />
    <div class="monitor-hr-overlay">
      <span class="monitor-hr-value">{{ store.displayHeartRate ?? '--' }}</span>
      <span class="monitor-hr-unit">BPM</span>
      <span class="monitor-hr-rhythm">{{ store.displayRhythm }}</span>
    </div>
  </div>
</template>
