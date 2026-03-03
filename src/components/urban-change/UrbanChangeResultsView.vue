<script setup lang="ts">
import { computed, ref } from 'vue'
import { Loader2, AlertCircle, ArrowLeft, RotateCcw, Download } from 'lucide-vue-next'
import { useUrbanChangeStore } from '@/stores/urban-change'
import { useUrbanAnalysis } from '@/composables/useUrbanAnalysis'
import { exportUrbanChangePdf } from '@/services/urban-change-pdf'
import UrbanChangeResultsMap from '@/components/urban-change/UrbanChangeResultsMap.vue'
import UrbanChangeStatsCards from '@/components/urban-change/UrbanChangeStatsCards.vue'
import UrbanChangeNarrativePanel from '@/components/urban-change/UrbanChangeNarrativePanel.vue'

const store = useUrbanChangeStore()
const { runAnalysis } = useUrbanAnalysis()

const isLoading = computed(() =>
  ['fetching-old', 'fetching-new', 'diffing', 'ai-narrating'].includes(store.analysisState),
)
const isError = computed(() => store.analysisState === 'error')
const isDone = computed(() => store.analysisState === 'done')

const loadingMessage = computed(() => {
  switch (store.analysisState) {
    case 'fetching-old': return `Fetching ${store.yearA} data...`
    case 'fetching-new': return `Fetching ${store.yearB} data...`
    case 'diffing': return 'Comparing snapshots...'
    case 'ai-narrating': return 'Generating AI analysis...'
    default: return 'Processing...'
  }
})

const isExporting = ref(false)

const totalChanges = computed(() => {
  if (!store.changeSummary) return 0
  const s = store.changeSummary.stats
  return s.addedCount + s.removedCount + s.modifiedCount
})

const totalBuildings = computed(() => {
  if (!store.changeSummary) return 0
  const s = store.changeSummary.stats
  return s.totalBuildingsYearA + s.totalBuildingsYearB
})

const locationName = computed(() =>
  store.selectedLocation?.name ?? 'Unknown Location',
)

function goBackToConfigure() {
  store.goToStage(2)
}

function startNewAnalysis() {
  store.reset()
}

function retryAnalysis() {
  runAnalysis()
}

async function handleExportPdf() {
  if (isExporting.value) return
  isExporting.value = true
  try {
    await exportUrbanChangePdf('uc-dashboard-content', locationName.value)
  } catch (err) {
    console.error('PDF export failed:', err)
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="uc-results-page">
    <div v-if="isLoading" class="uc-loading-card">
      <div class="uc-loading-spinner-wrap">
        <Loader2 :size="32" class="uc-loading-spinner" />
      </div>
      <p class="uc-loading-text">{{ loadingMessage }}</p>
      <p class="uc-loading-subtext">This may take a moment depending on the area size.</p>
    </div>

    <div v-else-if="isError" class="uc-error-card">
      <div class="uc-error-icon-wrap">
        <AlertCircle :size="28" class="uc-error-icon" />
      </div>
      <h3 class="uc-error-title">Analysis Failed</h3>
      <p class="uc-error-message">{{ store.analysisError || 'An unexpected error occurred.' }}</p>
      <div class="uc-error-actions">
        <button class="uc-secondary-btn" @click="goBackToConfigure">
          <ArrowLeft :size="14" />
          Back to Configuration
        </button>
        <button class="uc-primary-btn" @click="retryAnalysis">
          <RotateCcw :size="14" />
          Try Again
        </button>
      </div>
    </div>

    <template v-else-if="isDone">
      <div class="uc-toolbar">
        <button class="uc-toolbar-btn" @click="goBackToConfigure">
          <ArrowLeft :size="14" />
          Back to Configuration
        </button>
        <button class="uc-toolbar-btn" @click="startNewAnalysis">
          <RotateCcw :size="14" />
          New Analysis
        </button>
        <button
          class="uc-toolbar-btn uc-toolbar-btn--export"
          :disabled="isExporting"
          @click="handleExportPdf"
        >
          <Loader2 v-if="isExporting" :size="14" class="uc-loading-spinner" />
          <Download v-else :size="14" />
          {{ isExporting ? 'Exporting...' : 'Export PDF' }}
        </button>
      </div>

      <div v-if="totalBuildings < 5" class="uc-edge-case-card">
        <AlertCircle :size="20" class="uc-edge-case-icon" />
        <p class="uc-edge-case-text">Limited mapping coverage in this area. Try a larger city.</p>
      </div>

      <div v-if="totalChanges === 0" class="uc-edge-case-card">
        <AlertCircle :size="20" class="uc-edge-case-icon" />
        <p class="uc-edge-case-text">No significant changes detected between these years. Try a wider time range or a different area.</p>
      </div>

      <div id="uc-dashboard-content" class="uc-dashboard-content">
        <div class="uc-split-view">
          <div class="uc-map-panel">
            <UrbanChangeResultsMap />
          </div>
          <div class="uc-info-panel">
            <UrbanChangeStatsCards />
            <UrbanChangeNarrativePanel />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
