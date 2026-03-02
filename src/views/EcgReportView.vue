<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ArrowLeft, Download, Loader2, RefreshCw } from 'lucide-vue-next'
import { useEcgAnalyzerStore } from '@/stores/ecg-analyzer'
import { useEcgReport } from '@/composables/useEcgReport'
import { exportEcgReportToPDF } from '@/services/ecg-pdf-export'
import EcgAiReport from '@/components/ecg/EcgAiReport.vue'
import EcgMetricsPanel from '@/components/ecg/EcgMetricsPanel.vue'
import EcgAbnormalityFlags from '@/components/ecg/EcgAbnormalityFlags.vue'

const store = useEcgAnalyzerStore()
const { generateReport } = useEcgReport()
const reportRef = ref<HTMLElement | null>(null)
const isExporting = ref(false)

onMounted(() => {
  if (store.aiState !== 'complete') {
    generateReport()
  }
})

function goBack() {
  store.goToStage(2)
}

async function handleExportPDF() {
  if (!reportRef.value) return
  isExporting.value = true
  try {
    await exportEcgReportToPDF(reportRef.value)
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="ecg-report-page">
    <!-- Loading state -->
    <div v-if="store.aiState === 'loading'" class="ecg-processing">
      <div class="ecg-processing-card">
        <Loader2 :size="32" :stroke-width="2" class="ecg-spinner" />
        <h2 class="ecg-processing-title">Generating AI Interpretation</h2>
        <p class="ecg-processing-desc">
          Analyzing metrics and generating clinical narrative...
        </p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="store.aiState === 'error'" class="ecg-error-state">
      <p class="ecg-error-message">{{ store.aiError }}</p>
      <div class="ecg-error-actions">
        <button class="ecg-secondary-btn" @click="goBack">
          <ArrowLeft :size="14" :stroke-width="2.5" />
          Back
        </button>
        <button class="ecg-primary-btn" @click="generateReport">
          <RefreshCw :size="14" :stroke-width="2.5" />
          Retry
        </button>
      </div>
    </div>

    <!-- Report -->
    <div v-else-if="store.aiState === 'complete' && store.aiInterpretation" class="ecg-report-content">
      <div class="ecg-report-header-bar">
        <h2 class="ecg-report-main-title">ECG Analysis Report</h2>
        <div class="ecg-report-header-actions">
          <button class="ecg-secondary-btn" @click="goBack">
            <ArrowLeft :size="14" :stroke-width="2.5" />
            Back
          </button>
          <button class="ecg-primary-btn" :disabled="isExporting" @click="handleExportPDF">
            <Loader2 v-if="isExporting" :size="14" :stroke-width="2.5" class="ecg-spinner" />
            <Download v-else :size="14" :stroke-width="2.5" />
            {{ isExporting ? 'Exporting...' : 'Export PDF' }}
          </button>
        </div>
      </div>

      <div ref="reportRef" class="ecg-report-body">
        <div class="ecg-report-grid">
          <div class="ecg-report-main">
            <EcgAiReport :interpretation="store.aiInterpretation" />
          </div>

          <aside v-if="store.analysisResult" class="ecg-report-sidebar">
            <EcgMetricsPanel :result="store.analysisResult" :compact="true" />
            <EcgAbnormalityFlags :flags="store.analysisResult.abnormalities" />
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>
