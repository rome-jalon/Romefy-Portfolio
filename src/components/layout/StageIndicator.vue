<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import { useNutritionStore } from '@/stores/nutrition'
import type { Stage } from '@/types'

const store = useNutritionStore()

const stages = [
  { number: 1 as Stage, label: 'Upload' },
  { number: 2 as Stage, label: 'Goals' },
  { number: 3 as Stage, label: 'Dashboard' },
]

const currentStage = computed(() => store.currentStage)

function isCompleted(stage: Stage): boolean {
  return stage < currentStage.value
}

function isActive(stage: Stage): boolean {
  return stage === currentStage.value
}

function canNavigate(stage: Stage): boolean {
  return isCompleted(stage)
}

function navigateTo(stage: Stage) {
  if (canNavigate(stage)) {
    store.goToStage(stage)
  }
}
</script>

<template>
  <nav class="stage-nav">
    <template v-for="(stage, index) in stages" :key="stage.number">
      <div
        v-if="index > 0"
        class="stage-connector"
        :class="{ 'is-reached': isCompleted(stage.number) || isActive(stage.number) }"
      />

      <button
        :disabled="!canNavigate(stage.number)"
        class="stage-btn"
        :class="{ 'is-clickable': canNavigate(stage.number) }"
        @click="navigateTo(stage.number)"
      >
        <div
          class="stage-circle"
          :class="{
            'is-completed': isCompleted(stage.number),
            'is-active': isActive(stage.number),
          }"
        >
          <Check v-if="isCompleted(stage.number)" :size="16" :stroke-width="2.5" />
          <span v-else>{{ stage.number }}</span>
        </div>

        <span
          class="stage-label"
          :class="{
            'is-active': isActive(stage.number),
            'is-completed': isCompleted(stage.number),
          }"
        >
          {{ stage.label }}
        </span>
      </button>
    </template>
  </nav>
</template>
