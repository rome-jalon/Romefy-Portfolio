<script setup lang="ts">
import { ref, watch } from 'vue'
import TaskBreakdownHeader from '@/components/task-breakdown/TaskBreakdownHeader.vue'
import TaskInputView from '@/views/TaskInputView.vue'
import TaskResultsView from '@/views/TaskResultsView.vue'
import { useTaskBreakdownStore } from '@/stores/task-breakdown'

const store = useTaskBreakdownStore()

const transitionName = ref('slide-left')

watch(
  () => store.currentStage,
  (newStage, oldStage) => {
    transitionName.value = newStage >= oldStage ? 'slide-left' : 'slide-right'
  },
)
</script>

<template>
  <div class="app-shell">
    <TaskBreakdownHeader />

    <main class="app-main">
      <div class="app-container">
        <transition :name="transitionName" mode="out-in">
          <TaskInputView v-if="store.currentStage === 1" key="input" />
          <TaskResultsView v-else key="results" />
        </transition>
      </div>
    </main>
  </div>
</template>
