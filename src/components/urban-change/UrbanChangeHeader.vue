<script setup lang="ts">
import { MapPin, ArrowLeft } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { useUrbanChangeStore } from '@/stores/urban-change'

const store = useUrbanChangeStore()

const stages = [
  { num: 1, label: 'Select' },
  { num: 2, label: 'Configure' },
  { num: 3, label: 'Results' },
]

function goHome() {
  store.goToStage(1)
}

function goToStage(stage: number) {
  if (stage < store.currentStage) {
    store.goToStage(stage as 1 | 2 | 3)
  }
}
</script>

<template>
  <header class="uc-header">
    <div class="header-inner">
      <div class="header-content">
        <div class="header-left">
          <RouterLink to="/" class="back-to-portfolio">
            <ArrowLeft :size="14" :stroke-width="2.5" />
            Portfolio
          </RouterLink>

          <a class="uc-logo-link" @click="goHome">
            <div class="uc-logo-icon-wrap">
              <MapPin :size="18" class="logo-icon" :stroke-width="2.5" />
            </div>
            <span class="logo-text">
              Romefy <span class="uc-logo-accent">Urban Change</span>
            </span>
          </a>
        </div>

        <nav class="stage-nav">
          <template v-for="(stage, idx) in stages" :key="stage.num">
            <div
              v-if="idx > 0"
              class="stage-connector"
              :class="{ 'is-reached': store.currentStage >= stage.num }"
            />
            <button
              class="stage-btn"
              :class="{ 'is-clickable': stage.num < store.currentStage }"
              @click="goToStage(stage.num)"
            >
              <span
                class="stage-circle"
                :class="{
                  'is-active': store.currentStage === stage.num,
                  'is-completed': store.currentStage > stage.num,
                  'uc-stage-active': store.currentStage === stage.num,
                  'uc-stage-completed': store.currentStage > stage.num,
                }"
              >
                {{ stage.num }}
              </span>
              <span
                class="stage-label"
                :class="{
                  'is-active': store.currentStage >= stage.num,
                }"
              >
                {{ stage.label }}
              </span>
            </button>
          </template>
        </nav>
      </div>
    </div>
  </header>
</template>
