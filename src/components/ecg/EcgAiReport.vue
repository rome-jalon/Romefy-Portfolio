<script setup lang="ts">
import { ShieldAlert, Brain, Heart, Activity, Clock, Compass, AlertTriangle, Stethoscope } from 'lucide-vue-next'
import type { EcgAiInterpretation } from '@/types/ecg'

defineProps<{
  interpretation: EcgAiInterpretation
}>()

const sections = [
  { key: 'summary', label: 'Summary', icon: Brain },
  { key: 'rhythmAnalysis', label: 'Rhythm Analysis', icon: Activity },
  { key: 'rateAssessment', label: 'Rate Assessment', icon: Heart },
  { key: 'intervalAnalysis', label: 'Interval Analysis', icon: Clock },
  { key: 'axisEstimation', label: 'Axis Estimation', icon: Compass },
  { key: 'abnormalityAssessment', label: 'Abnormality Assessment', icon: AlertTriangle },
  { key: 'clinicalCorrelation', label: 'Clinical Correlation', icon: Stethoscope },
] as const
</script>

<template>
  <div class="ecg-ai-report">
    <div class="ecg-disclaimer">
      <ShieldAlert :size="18" :stroke-width="2" />
      <div class="ecg-disclaimer-text">
        <strong>Disclaimer:</strong> This AI-generated analysis is for educational and demonstration
        purposes only. It does not constitute medical advice, diagnosis, or treatment. Always consult
        a qualified healthcare professional for medical decisions.
      </div>
    </div>

    <div class="ecg-report-sections">
      <div
        v-for="section in sections"
        :key="section.key"
        class="ecg-report-section"
        :class="{ 'is-summary': section.key === 'summary' }"
      >
        <div class="ecg-report-section-header">
          <component :is="section.icon" :size="16" :stroke-width="2" />
          <h4 class="ecg-report-section-title">{{ section.label }}</h4>
        </div>
        <p class="ecg-report-section-body">
          {{ interpretation[section.key] }}
        </p>
      </div>
    </div>
  </div>
</template>
