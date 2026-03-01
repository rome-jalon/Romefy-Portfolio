<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'
</script>

<template>
  <div class="tb-loading-state">
    <div class="tb-loading-icon-wrap">
      <Sparkles :size="28" class="tb-loading-icon" />
    </div>
    <h3 class="tb-loading-title">Breaking down your tasks</h3>
    <p class="tb-loading-desc">AI is analyzing your instruction and generating structured tasks...</p>
    <div class="tb-loading-dots">
      <span class="tb-loading-dot"></span>
      <span class="tb-loading-dot"></span>
      <span class="tb-loading-dot"></span>
    </div>
  </div>
</template>
