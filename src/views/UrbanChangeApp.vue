<script setup lang="ts">
import { ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import UrbanChangeHeader from '@/components/urban-change/UrbanChangeHeader.vue'
import UrbanChangeSelectView from '@/components/urban-change/UrbanChangeSelectView.vue'
import UrbanChangeConfigView from '@/components/urban-change/UrbanChangeConfigView.vue'
import UrbanChangeResultsView from '@/components/urban-change/UrbanChangeResultsView.vue'
import { useUrbanChangeStore } from '@/stores/urban-change'

const store = useUrbanChangeStore()
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
    <UrbanChangeHeader />
    <main class="app-main">
      <div class="app-container">
        <transition :name="transitionName" mode="out-in">
          <UrbanChangeSelectView v-if="store.currentStage === 1" key="select" />
          <UrbanChangeConfigView v-else-if="store.currentStage === 2" key="config" />
          <UrbanChangeResultsView v-else key="results" />
        </transition>
      </div>
    </main>
  </div>
</template>
