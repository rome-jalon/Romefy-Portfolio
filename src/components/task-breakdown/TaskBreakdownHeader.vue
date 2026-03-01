<script setup lang="ts">
import { ListChecks, ArrowLeft } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { useTaskBreakdownStore } from '@/stores/task-breakdown'

const store = useTaskBreakdownStore()

function goHome() {
  store.goToStage(1)
}
</script>

<template>
  <header class="tb-header">
    <div class="header-inner">
      <div class="header-content">
        <div class="header-left">
          <RouterLink to="/" class="back-to-portfolio">
            <ArrowLeft :size="14" :stroke-width="2.5" />
            Portfolio
          </RouterLink>

          <a class="tb-logo-link" @click="goHome">
            <div class="tb-logo-icon-wrap">
              <ListChecks :size="18" class="logo-icon" :stroke-width="2.5" />
            </div>
            <span class="logo-text">
              Romefy <span class="tb-logo-accent">Tasks</span>
            </span>
          </a>
        </div>
      </div>
    </div>
  </header>
</template>
