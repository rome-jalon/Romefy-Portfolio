<script setup lang="ts">
import { ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import EcgAnalyzerHeader from '@/components/ecg/EcgAnalyzerHeader.vue'
import EcgUploadView from '@/views/EcgUploadView.vue'
import EcgAnalyzeView from '@/views/EcgAnalyzeView.vue'
import EcgReportView from '@/views/EcgReportView.vue'
import { useEcgAnalyzerStore } from '@/stores/ecg-analyzer'

const store = useEcgAnalyzerStore()

const transitionName = ref('slide-left')

watch(
  () => store.currentStage,
  (newStage, oldStage) => {
    transitionName.value = newStage >= oldStage ? 'slide-left' : 'slide-right'
  },
)

onBeforeRouteLeave(() => {
  store.reset()
})
</script>

<template>
  <div class="app-shell">
    <EcgAnalyzerHeader />

    <main class="app-main">
      <div class="app-container">
        <transition :name="transitionName" mode="out-in">
          <EcgUploadView v-if="store.currentStage === 1" key="upload" />
          <EcgAnalyzeView v-else-if="store.currentStage === 2" key="analyze" />
          <EcgReportView v-else key="report" />
        </transition>
      </div>
    </main>
  </div>
</template>
