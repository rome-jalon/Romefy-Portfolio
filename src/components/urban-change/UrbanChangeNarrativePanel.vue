<script setup lang="ts">
import { computed } from 'vue'
import { FileText, Lightbulb, TrendingUp, Building2, RefreshCw } from 'lucide-vue-next'
import { useUrbanChangeStore } from '@/stores/urban-change'
import { useUrbanAnalysis } from '@/composables/useUrbanAnalysis'

const store = useUrbanChangeStore()
const { runAnalysis } = useUrbanAnalysis()

const narrative = computed(() => store.aiNarrative)
const isLoading = computed(() => store.aiState === 'loading')
const isError = computed(() => store.aiState === 'error')
const isDone = computed(() => store.aiState === 'done')

function retryNarrative() {
  runAnalysis()
}

const sections = computed(() => {
  if (!narrative.value) return []
  return [
    { icon: FileText, title: 'Overview', text: narrative.value.overview },
    { icon: TrendingUp, title: 'Key Changes', text: narrative.value.keyChanges },
    { icon: Lightbulb, title: 'Possible Drivers', text: narrative.value.possibleDrivers },
    { icon: Building2, title: 'Urban Development Context', text: narrative.value.urbanContext },
  ]
})
</script>

<template>
  <div class="uc-narrative-panel">
    <h3 class="uc-narrative-heading">AI Analysis</h3>

    <div v-if="isLoading" class="uc-narrative-skeleton">
      <div class="uc-skeleton-block" />
      <div class="uc-skeleton-block uc-skeleton-block--short" />
      <div class="uc-skeleton-block" />
      <div class="uc-skeleton-block uc-skeleton-block--medium" />
    </div>

    <div v-else-if="isError" class="uc-narrative-error">
      <p class="uc-narrative-error-text">{{ store.aiError || 'Failed to generate AI analysis.' }}</p>
      <button class="uc-secondary-btn" @click="retryNarrative">
        <RefreshCw :size="14" />
        Try Again
      </button>
    </div>

    <div v-else-if="isDone && narrative" class="uc-narrative-sections">
      <div
        v-for="(section, idx) in sections"
        :key="idx"
        class="uc-narrative-section"
      >
        <div class="uc-narrative-title">
          <component :is="section.icon" :size="16" class="uc-narrative-title-icon" />
          {{ section.title }}
        </div>
        <p class="uc-narrative-text">{{ section.text }}</p>
      </div>
    </div>
  </div>
</template>
