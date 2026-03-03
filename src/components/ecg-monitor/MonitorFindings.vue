<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEcgMonitorStore } from '@/stores/ecg-monitor'

const store = useEcgMonitorStore()
const aiExpanded = ref(false)

function severityClass(severity: string): string {
  if (severity === 'critical') return 'is-red'
  if (severity === 'warning') return 'is-yellow'
  return 'is-green'
}

function fmt(val: number | null | undefined, unit: string): string {
  if (val == null) return '--'
  return `${Math.round(val)} ${unit}`
}

const reviewLabel = computed(() => {
  if (store.reviewStatus === 'confirmed') return 'System Interpretation — Confirmed'
  if (store.reviewStatus === 'flagged') return 'System Interpretation — Flagged'
  if (store.reviewStatus === 'overridden') return 'System Interpretation — Overridden'
  return 'System Interpretation — Review Required'
})

const reviewLabelClass = computed(() => {
  if (store.reviewStatus === 'confirmed') return 'is-confirmed'
  if (store.reviewStatus === 'pending') return 'is-review'
  return ''
})

const statusText = computed(() => {
  return store.reviewStatus.charAt(0).toUpperCase() + store.reviewStatus.slice(1)
})

const aiFields = computed(() => {
  if (!store.aiInterpretation) return []
  const interp = store.aiInterpretation
  return [
    { label: 'Summary', value: interp.summary },
    { label: 'Rhythm Analysis', value: interp.rhythmAnalysis },
    { label: 'Rate Assessment', value: interp.rateAssessment },
    { label: 'Axis & Intervals', value: interp.intervalAnalysis },
    { label: 'Morphology', value: interp.axisEstimation },
    { label: 'Abnormality Assessment', value: interp.abnormalityAssessment },
    { label: 'Clinical Recommendation', value: interp.clinicalCorrelation },
  ]
})
</script>

<template>
  <div v-if="!store.analysisResult" class="monitor-empty-state">
    Awaiting first analysis...
  </div>

  <template v-else>
    <div class="monitor-findings-section">
      <div class="monitor-review-header">
        <span
          class="monitor-section-label"
          :class="reviewLabelClass"
        >
          {{ reviewLabel }}
        </span>
        <span
          class="monitor-status-badge"
          :class="`is-${store.reviewStatus}`"
        >
          {{ statusText }}
        </span>
      </div>

      <div class="monitor-metrics-grid">
        <div class="monitor-metric-card">
          <div class="monitor-metric-value">
            {{ store.analysisResult.heartRate != null ? Math.round(store.analysisResult.heartRate) : '--' }}
            <template v-if="store.analysisResult.heartRate != null"> bpm</template>
          </div>
          <div class="monitor-metric-label">Heart Rate</div>
        </div>

        <div class="monitor-metric-card">
          <div class="monitor-metric-value">{{ store.analysisResult.rhythm }}</div>
          <div class="monitor-metric-label">Rhythm</div>
        </div>

        <div class="monitor-metric-card">
          <div class="monitor-metric-value">{{ fmt(store.analysisResult.intervals.pr, 'ms') }}</div>
          <div class="monitor-metric-label">PR Interval</div>
        </div>

        <div class="monitor-metric-card">
          <div class="monitor-metric-value">{{ fmt(store.analysisResult.intervals.qrs, 'ms') }}</div>
          <div class="monitor-metric-label">QRS Duration</div>
        </div>

        <div class="monitor-metric-card">
          <div class="monitor-metric-value">{{ fmt(store.analysisResult.intervals.qtc, 'ms') }}</div>
          <div class="monitor-metric-label">QTc</div>
        </div>

        <div class="monitor-metric-card">
          <div class="monitor-metric-value">
            {{ store.analysisResult.rrStats != null ? `${Math.round(store.analysisResult.rrStats.cv)}%` : '--' }}
          </div>
          <div class="monitor-metric-label">RR Variability</div>
        </div>
      </div>

      <div
        v-if="store.analysisResult.abnormalities.length > 0"
        class="monitor-badges-row"
      >
        <span
          v-for="flag in store.analysisResult.abnormalities"
          :key="flag.name"
          class="monitor-badge"
          :class="severityClass(flag.severity)"
        >
          {{ flag.name }}
        </span>
      </div>
    </div>

    <div class="monitor-ai-section">
      <button
        class="monitor-ai-toggle"
        @click="aiExpanded = !aiExpanded"
      >
        {{ aiExpanded ? 'Hide' : 'Show' }} AI Interpretation
      </button>

      <div v-if="aiExpanded" class="monitor-ai-content">
        <div v-if="store.aiState === 'loading'" class="monitor-ai-loading">
          Generating AI interpretation...
        </div>

        <div v-else-if="store.aiState === 'error'" class="monitor-ai-error">
          {{ store.aiError ?? 'Failed to generate interpretation.' }}
        </div>

        <template v-else-if="store.aiState === 'complete' && aiFields.length > 0">
          <div
            v-for="field in aiFields"
            :key="field.label"
            class="monitor-ai-field"
          >
            <div class="monitor-ai-field-label">{{ field.label }}</div>
            <div class="monitor-ai-field-value">{{ field.value }}</div>
          </div>
        </template>

        <div v-else class="monitor-ai-loading">
          AI interpretation not yet available.
        </div>
      </div>
    </div>
  </template>
</template>
