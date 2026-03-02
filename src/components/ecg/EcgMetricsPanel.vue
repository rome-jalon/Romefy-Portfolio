<script setup lang="ts">
import { computed } from 'vue'
import { Heart, Clock, Zap, Timer, Activity, BarChart3 } from 'lucide-vue-next'
import type { EcgAnalysisResult, AbnormalitySeverity } from '@/types/ecg'
import { ECG_NORMAL_RANGES } from '@/types/ecg'

const props = defineProps<{
  result: EcgAnalysisResult
  compact?: boolean
}>()

interface MetricCard {
  label: string
  value: string
  unit: string
  severity: AbnormalitySeverity
  icon: typeof Heart
}

function getHeartRateSeverity(hr: number): AbnormalitySeverity {
  const r = ECG_NORMAL_RANGES.heartRate
  if (hr >= r.min && hr <= r.max) return 'normal'
  if (hr >= r.warningLow && hr <= r.warningHigh) return 'warning'
  return 'critical'
}

function getIntervalSeverity(
  value: number | null,
  range: { min: number; max: number; warningMax?: number },
): AbnormalitySeverity {
  if (value === null) return 'normal'
  if (value >= range.min && value <= range.max) return 'normal'
  if (range.warningMax && value <= range.warningMax) return 'warning'
  return 'critical'
}

const metrics = computed<MetricCard[]>(() => {
  const r = props.result
  const cards: MetricCard[] = [
    {
      label: 'Heart Rate',
      value: Math.round(r.aggregateHeartRate).toString(),
      unit: 'bpm',
      severity: getHeartRateSeverity(r.aggregateHeartRate),
      icon: Heart,
    },
    {
      label: 'Rhythm',
      value: r.aggregateRhythm,
      unit: '',
      severity: r.aggregateRhythm === 'Regular' ? 'normal' : r.aggregateRhythm === 'Mildly Irregular' ? 'warning' : 'critical',
      icon: Activity,
    },
    {
      label: 'PR Interval',
      value: r.aggregateIntervals.pr !== null ? Math.round(r.aggregateIntervals.pr).toString() : '—',
      unit: r.aggregateIntervals.pr !== null ? 'ms' : '',
      severity: getIntervalSeverity(r.aggregateIntervals.pr, ECG_NORMAL_RANGES.pr),
      icon: Clock,
    },
    {
      label: 'QRS Duration',
      value: r.aggregateIntervals.qrs !== null ? Math.round(r.aggregateIntervals.qrs).toString() : '—',
      unit: r.aggregateIntervals.qrs !== null ? 'ms' : '',
      severity: getIntervalSeverity(r.aggregateIntervals.qrs, ECG_NORMAL_RANGES.qrs),
      icon: Zap,
    },
    {
      label: 'QTc',
      value: r.aggregateIntervals.qtc !== null ? Math.round(r.aggregateIntervals.qtc).toString() : '—',
      unit: r.aggregateIntervals.qtc !== null ? 'ms' : '',
      severity: getIntervalSeverity(r.aggregateIntervals.qtc, ECG_NORMAL_RANGES.qtc),
      icon: Timer,
    },
    {
      label: 'RR Mean',
      value: Math.round(r.aggregateRRStats.mean).toString(),
      unit: 'ms',
      severity: 'normal',
      icon: BarChart3,
    },
  ]
  return cards
})
</script>

<template>
  <div class="ecg-metrics-panel" :class="{ 'is-compact': compact }">
    <div
      v-for="metric in metrics"
      :key="metric.label"
      class="ecg-metric-card"
      :class="`is-${metric.severity}`"
    >
      <div class="ecg-metric-header">
        <component :is="metric.icon" :size="14" :stroke-width="2" />
        <span class="ecg-metric-label">{{ metric.label }}</span>
      </div>
      <div class="ecg-metric-value-row">
        <span class="ecg-metric-value">{{ metric.value }}</span>
        <span v-if="metric.unit" class="ecg-metric-unit">{{ metric.unit }}</span>
      </div>
    </div>
  </div>
</template>
