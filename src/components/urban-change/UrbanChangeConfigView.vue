<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ArrowLeft, Calendar, Filter, Play, MapPin } from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useUrbanChangeStore } from '@/stores/urban-change'
import { useUrbanAnalysis } from '@/composables/useUrbanAnalysis'
import type { FocusFilter } from '@/types/urban-change'

const store = useUrbanChangeStore()
const { runAnalysis } = useUrbanAnalysis()

const localYearA = ref(store.yearA)
const localYearB = ref(store.yearB)
const localFocus = ref<FocusFilter>(store.focusFilter)
let miniMap: L.Map | null = null

const years = Array.from({ length: 2025 - 2007 + 1 }, (_, i) => 2007 + i)

const yearBOptions = computed(() => years.filter((y) => y > localYearA.value))

const isYearValid = computed(() => localYearB.value > localYearA.value)

const focusOptions: Array<{ value: FocusFilter; label: string }> = [
  { value: 'buildings', label: 'Buildings' },
  { value: 'landuse', label: 'Land Use' },
  { value: 'all', label: 'All' },
]

function goBack() {
  store.goToStage(1)
}

function handleYearAChange(event: Event) {
  const value = parseInt((event.target as HTMLSelectElement).value)
  localYearA.value = value
  if (localYearB.value <= value) {
    localYearB.value = value + 1
  }
  store.setYears(localYearA.value, localYearB.value)
}

function handleYearBChange(event: Event) {
  localYearB.value = parseInt((event.target as HTMLSelectElement).value)
  store.setYears(localYearA.value, localYearB.value)
}

function setFocus(focus: FocusFilter) {
  localFocus.value = focus
  store.setFocusFilter(focus)
}

function startAnalysis() {
  if (!isYearValid.value) return
  store.setYears(localYearA.value, localYearB.value)
  store.setFocusFilter(localFocus.value)
  runAnalysis()
}

onMounted(() => {
  nextTick(() => {
    if (!store.selectedBounds) return

    const b = store.selectedBounds
    const center: L.LatLngExpression = [
      (b.south + b.north) / 2,
      (b.west + b.east) / 2,
    ]

    miniMap = L.map('uc-mini-map', {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: false,
    }).setView(center, 14)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(miniMap)

    const rect = L.rectangle(
      [[b.south, b.west], [b.north, b.east]],
      { color: '#10b981', weight: 2, fillOpacity: 0.2 },
    )
    rect.addTo(miniMap)
    miniMap.fitBounds(rect.getBounds(), { padding: [20, 20] })
  })
})

onUnmounted(() => {
  if (miniMap) {
    miniMap.remove()
    miniMap = null
  }
})
</script>

<template>
  <div class="uc-config-page">
    <div class="uc-config-card">
      <div class="uc-config-header">
        <button class="uc-secondary-btn" @click="goBack">
          <ArrowLeft :size="16" />
          Back
        </button>
        <h2 class="uc-config-title">Configure Analysis</h2>
      </div>

      <div class="uc-config-location">
        <div class="uc-mini-map-wrap">
          <div id="uc-mini-map" class="uc-mini-map" />
        </div>
        <div class="uc-config-location-info">
          <MapPin :size="16" class="uc-config-location-icon" />
          <span class="uc-config-location-name">{{ store.selectedLocation?.name || 'Selected Area' }}</span>
        </div>
      </div>

      <div class="uc-config-fields">
        <div class="uc-config-field">
          <label class="uc-config-label">
            <Calendar :size="14" class="uc-config-label-icon" />
            Year A (baseline)
          </label>
          <select class="uc-year-select" :value="localYearA" @change="handleYearAChange">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <div class="uc-config-field">
          <label class="uc-config-label">
            <Calendar :size="14" class="uc-config-label-icon" />
            Year B (comparison)
          </label>
          <select class="uc-year-select" :value="localYearB" @change="handleYearBChange">
            <option v-for="y in yearBOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <div class="uc-config-field">
          <label class="uc-config-label">
            <Filter :size="14" class="uc-config-label-icon" />
            Focus
          </label>
          <div class="uc-focus-group">
            <button
              v-for="opt in focusOptions"
              :key="opt.value"
              class="uc-focus-btn"
              :class="{ active: localFocus === opt.value }"
              @click="setFocus(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <button class="uc-primary-btn uc-run-btn" :disabled="!isYearValid" @click="startAnalysis">
        <Play :size="16" />
        Run Analysis
      </button>
    </div>
  </div>
</template>
