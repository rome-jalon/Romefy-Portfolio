<script setup lang="ts">
import { onMounted } from 'vue'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-vue-next'
import { useEcgAnalyzerStore } from '@/stores/ecg-analyzer'
import { useEcgAnalysis } from '@/composables/useEcgAnalysis'
import EcgCanvas from '@/components/ecg/EcgCanvas.vue'
import EcgMetricsPanel from '@/components/ecg/EcgMetricsPanel.vue'
import EcgAbnormalityFlags from '@/components/ecg/EcgAbnormalityFlags.vue'

const store = useEcgAnalyzerStore()
const { runAnalysis } = useEcgAnalysis()

onMounted(() => {
  if (store.ecgData && store.analysisState !== 'complete') {
    runAnalysis(store.ecgData)
  }
})

function goBack() {
  store.goToStage(1)
}

function proceedToReport() {
  store.goToStage(3)
}
</script>

<template>
  <div class="ecg-analyze-page">
    <!-- Loading state -->
    <div v-if="store.analysisState === 'analyzing'" class="ecg-processing">
      <div class="ecg-processing-card">
        <Loader2 :size="32" :stroke-width="2" class="ecg-spinner" />
        <h2 class="ecg-processing-title">Analyzing ECG Signal</h2>
        <p class="ecg-processing-desc">
          Processing lead {{ Math.ceil((store.analysisProgress / 100) * 12) }} of 12...
        </p>
        <div class="ecg-progress-bar">
          <div
            class="ecg-progress-fill"
            :style="{ width: `${store.analysisProgress}%` }"
          />
        </div>
        <span class="ecg-progress-label">{{ store.analysisProgress }}%</span>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="store.analysisState === 'error'" class="ecg-error-state">
      <p class="ecg-error-message">{{ store.analysisError }}</p>
      <button class="ecg-secondary-btn" @click="goBack">
        <ArrowLeft :size="14" :stroke-width="2.5" />
        Back to Upload
      </button>
    </div>

    <!-- Results -->
    <div v-else-if="store.analysisState === 'complete' && store.analysisResult" class="ecg-results">
      <EcgMetricsPanel :result="store.analysisResult" />

      <EcgCanvas
        :analysis-result="store.analysisResult"
        :sampling-rate="store.ecgData!.samplingRate"
      />

      <EcgAbnormalityFlags :flags="store.analysisResult.abnormalities" />

      <div class="ecg-analyze-actions">
        <button class="ecg-secondary-btn" @click="goBack">
          <ArrowLeft :size="14" :stroke-width="2.5" />
          Back
        </button>
        <button class="ecg-primary-btn" @click="proceedToReport">
          Generate AI Report
          <ArrowRight :size="16" :stroke-width="2" />
        </button>
      </div>
    </div>
  </div>
</template>
