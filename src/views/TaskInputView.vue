<script setup lang="ts">
import { ListChecks } from 'lucide-vue-next'
import TaskInputForm from '@/components/task-breakdown/TaskInputForm.vue'
import { useTaskBreakdownStore } from '@/stores/task-breakdown'
import { useTaskGenerator } from '@/composables/useTaskGenerator'

const store = useTaskBreakdownStore()
const { generate } = useTaskGenerator()

function handleSubmit(instruction: string, mdContent: string | null, hierarchical: boolean) {
  store.setInput({ instruction, mdContent, hierarchical })
  generate()
}
</script>

<template>
  <div class="view-stack">
    <div class="tb-page-intro">
      <div class="tb-intro-icon-wrap">
        <ListChecks :size="24" class="tb-intro-icon" />
      </div>
      <h1 class="view-title">AI Task Breakdown</h1>
      <p class="view-subtitle">
        Describe what you want to accomplish and let AI break it down into structured, actionable tasks.
      </p>
    </div>

    <TaskInputForm @submit="handleSubmit" />
  </div>
</template>
