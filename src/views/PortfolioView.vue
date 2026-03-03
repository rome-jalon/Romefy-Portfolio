<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Leaf, ListChecks, Activity, MapPin, HeartPulse } from 'lucide-vue-next'
import { projects } from '@/config/projects'
import type { Component } from 'vue'

const router = useRouter()

const iconMap: Record<string, Component> = {
  Leaf,
  ListChecks,
  Activity,
  MapPin,
  HeartPulse,
}

function openProject(route: string) {
  router.push(route)
}
</script>

<template>
  <div class="portfolio-page">
    <section class="portfolio-hero">
      <h1 class="portfolio-hero-title">
        Romefy <span class="portfolio-hero-accent">Portfolio</span>
      </h1>
      <p class="portfolio-hero-tagline">
        Interactive web applications built with modern frameworks
      </p>
    </section>

    <section class="portfolio-grid-section">
      <div class="portfolio-grid">
        <button
          v-for="project in projects"
          :key="project.id"
          class="project-card"
          @click="openProject(project.route)"
        >
          <div class="project-card-icon-wrap" :class="`project-icon--${project.id}`">
            <component
              :is="iconMap[project.icon]"
              :size="24"
              :stroke-width="2"
            />
          </div>
          <h2 class="project-card-title">{{ project.title }}</h2>
          <p class="project-card-desc">{{ project.description }}</p>
          <div class="project-card-tags">
            <span
              v-for="tag in project.tags"
              :key="tag"
              class="project-card-tag"
            >
              {{ tag }}
            </span>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>
