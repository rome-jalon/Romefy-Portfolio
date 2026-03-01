<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
</script>

<template>
  <div class="not-found-page">
    <div class="not-found-card">
      <span class="not-found-code">404</span>
      <h1 class="not-found-title">Page not found</h1>
      <p class="not-found-desc">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <RouterLink to="/" class="not-found-link">
        <ArrowLeft :size="16" :stroke-width="2" />
        Back to portfolio
      </RouterLink>
    </div>
  </div>
</template>
