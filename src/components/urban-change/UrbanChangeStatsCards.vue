<script setup lang="ts">
import { computed } from 'vue'
import { Building, Minus, Plus, ArrowRightLeft, Layers } from 'lucide-vue-next'
import { useUrbanChangeStore } from '@/stores/urban-change'

const store = useUrbanChangeStore()

const stats = computed(() => store.changeSummary?.stats ?? null)

function formatArea(m2: number): string {
  const abs = Math.abs(m2)
  if (abs >= 1_000_000) return `${(m2 / 1_000_000).toFixed(2)} km²`
  return `${Math.round(m2).toLocaleString()} m²`
}

function formatNetArea(m2: number): string {
  const sign = m2 >= 0 ? '+' : ''
  return `${sign}${formatArea(m2)}`
}
</script>

<template>
  <div v-if="stats" class="uc-stats-section">
    <div class="uc-stats-grid">
      <div class="uc-stat-card uc-stat-card--added">
        <div class="uc-stat-icon-wrap uc-stat-icon-wrap--added">
          <Plus :size="16" />
        </div>
        <div class="uc-stat-value">{{ stats.addedCount }}</div>
        <div class="uc-stat-label">New Buildings</div>
      </div>

      <div class="uc-stat-card uc-stat-card--removed">
        <div class="uc-stat-icon-wrap uc-stat-icon-wrap--removed">
          <Minus :size="16" />
        </div>
        <div class="uc-stat-value">{{ stats.removedCount }}</div>
        <div class="uc-stat-label">Removed</div>
      </div>

      <div class="uc-stat-card uc-stat-card--modified">
        <div class="uc-stat-icon-wrap uc-stat-icon-wrap--modified">
          <ArrowRightLeft :size="16" />
        </div>
        <div class="uc-stat-value">{{ stats.modifiedCount }}</div>
        <div class="uc-stat-label">Modified</div>
      </div>

      <div class="uc-stat-card">
        <div class="uc-stat-icon-wrap">
          <Layers :size="16" />
        </div>
        <div class="uc-stat-value">{{ formatNetArea(stats.netAreaChangeM2) }}</div>
        <div class="uc-stat-label">Net Area Change</div>
      </div>

      <div class="uc-stat-card">
        <div class="uc-stat-icon-wrap">
          <Building :size="16" />
        </div>
        <div class="uc-stat-value">{{ stats.totalBuildingsYearA }}</div>
        <div class="uc-stat-label">Buildings ({{ store.yearA }})</div>
      </div>

      <div class="uc-stat-card">
        <div class="uc-stat-icon-wrap">
          <Building :size="16" />
        </div>
        <div class="uc-stat-value">{{ stats.totalBuildingsYearB }}</div>
        <div class="uc-stat-label">Buildings ({{ store.yearB }})</div>
      </div>
    </div>

    <div v-if="stats.landUseShifts.length > 0" class="uc-landuse-shifts">
      <h4 class="uc-landuse-shifts-title">Land Use Shifts</h4>
      <ul class="uc-landuse-shifts-list">
        <li v-for="(shift, idx) in stats.landUseShifts" :key="idx" class="uc-landuse-shift-item">
          <span class="uc-shift-from">{{ shift.from }}</span>
          <span class="uc-shift-arrow">&rarr;</span>
          <span class="uc-shift-to">{{ shift.to }}</span>
          <span class="uc-shift-count">{{ shift.count }} areas</span>
        </li>
      </ul>
    </div>
  </div>
</template>
