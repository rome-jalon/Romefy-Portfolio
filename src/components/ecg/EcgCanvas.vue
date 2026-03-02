<script setup lang="ts">
import { ref, toRef } from 'vue'
import { Grid3x3, Crosshair } from 'lucide-vue-next'
import { useEcgCanvas } from '@/composables/useEcgCanvas'
import type { EcgAnalysisResult, EcgCanvasConfig } from '@/types/ecg'

const props = defineProps<{
  analysisResult: EcgAnalysisResult
  samplingRate: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const config = ref<EcgCanvasConfig>({
  showGrid: true,
  showRPeaks: true,
})

useEcgCanvas(
  canvasRef,
  toRef(props, 'analysisResult'),
  toRef(props, 'samplingRate'),
  config,
)

function toggleGrid() {
  config.value = { ...config.value, showGrid: !config.value.showGrid }
}

function toggleRPeaks() {
  config.value = { ...config.value, showRPeaks: !config.value.showRPeaks }
}
</script>

<template>
  <div class="ecg-canvas-section">
    <div class="ecg-toolbar">
      <button
        class="ecg-toolbar-btn"
        :class="{ 'is-active': config.showGrid }"
        @click="toggleGrid"
      >
        <Grid3x3 :size="14" :stroke-width="2" />
        <span>Grid</span>
      </button>
      <button
        class="ecg-toolbar-btn"
        :class="{ 'is-active': config.showRPeaks }"
        @click="toggleRPeaks"
      >
        <Crosshair :size="14" :stroke-width="2" />
        <span>R-Peaks</span>
      </button>
    </div>

    <div class="ecg-canvas-wrap">
      <canvas ref="canvasRef" class="ecg-canvas" />
    </div>

    <div class="ecg-canvas-legend">
      <span class="ecg-legend-item">
        <span class="ecg-legend-swatch ecg-legend-waveform" />
        Waveform
      </span>
      <span v-if="config.showRPeaks" class="ecg-legend-item">
        <span class="ecg-legend-swatch ecg-legend-rpeak" />
        R-Peaks
      </span>
      <span class="ecg-legend-item ecg-legend-scale">
        25 mm/s | 10 mm/mV
      </span>
    </div>
  </div>
</template>
