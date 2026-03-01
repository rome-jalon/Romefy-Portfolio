<script setup lang="ts">
import { ref, watch } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import UploadView from '@/views/UploadView.vue'
import GoalsView from '@/views/GoalsView.vue'
import DashboardView from '@/views/DashboardView.vue'
import { useNutritionStore } from '@/stores/nutrition'

const store = useNutritionStore()
const previousStage = ref(1)

const transitionName = ref('slide-left')

watch(
  () => store.currentStage,
  (newStage, oldStage) => {
    transitionName.value = newStage >= oldStage ? 'slide-left' : 'slide-right'
    previousStage.value = oldStage
  },
)
</script>

<template>
  <div class="app-shell">
    <AppHeader />

    <main class="app-main">
      <div class="app-container">
        <transition :name="transitionName" mode="out-in">
          <UploadView v-if="store.currentStage === 1" key="upload" />
          <GoalsView v-else-if="store.currentStage === 2" key="goals" />
          <DashboardView v-else key="dashboard" />
        </transition>
      </div>
    </main>
  </div>
</template>
