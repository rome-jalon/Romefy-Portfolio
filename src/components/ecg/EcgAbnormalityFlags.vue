<script setup lang="ts">
import { AlertTriangle, CheckCircle, AlertOctagon, Info } from 'lucide-vue-next'
import type { AbnormalityFlag } from '@/types/ecg'

defineProps<{
  flags: AbnormalityFlag[]
}>()

function getIcon(severity: string) {
  if (severity === 'critical') return AlertOctagon
  if (severity === 'warning') return AlertTriangle
  return Info
}
</script>

<template>
  <div class="ecg-abnormality-section">
    <h3 class="ecg-section-title">Abnormality Flags</h3>

    <div v-if="flags.length === 0" class="ecg-no-abnormalities">
      <CheckCircle :size="16" :stroke-width="2" />
      <span>No abnormalities detected</span>
    </div>

    <div v-else class="ecg-flag-list">
      <div
        v-for="(flag, idx) in flags"
        :key="idx"
        class="ecg-flag-badge"
        :class="`is-${flag.severity}`"
      >
        <component :is="getIcon(flag.severity)" :size="14" :stroke-width="2" />
        <div class="ecg-flag-content">
          <span class="ecg-flag-name">{{ flag.name }}</span>
          <span class="ecg-flag-desc">{{ flag.description }}</span>
          <span class="ecg-flag-range">Normal: {{ flag.normalRange }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
